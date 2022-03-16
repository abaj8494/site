---
title: Automate Building Custom Windows Images For Azure Virtual Desktop With Packer And GitHub Actions
date: "2022-02-25T04:04:20+01:00"
draft: true
comments: true
socialShare: true
toc: true
#cover:
#  src: cover.png
tags:
  - AVD
  - Azure
  - Azure CLI
  - Azure Virtual Desktop
  - CI
  - Continuous Integration
  - DevOps
  - GitHub Actions
  - IaC
  - Infrastructure as Code
  - Packer
  - Terraform
---

One aspect of managing [Azure Virtual Desktop (AVD)](https://azure.microsoft.com/en-us/services/virtual-desktop/) is keeping it up-to-date. One strategy is periodically building a "golden" image and re-deploying AVD session host VMs using the updated image. In this post, we'll use [Packer](https://www.packer.io/) and [GitHub Actions](https://github.com/features/actions) to build images and push them to Azure.

<!--more-->

First, we'll use [Terraform](https://www.terraform.io/) to prepare some resources for Packer: a resource group for build artifacts and a [service principal (SP)](https://www.packer.io/plugins/builders/azure/arm#service-principal) for authentication. We'll also export the SP credentials as GitHub Actions secrets, making them available to our CI workflow.

Then we'll build a customized Windows 11 image with Packer that can be used for software development. We'll use [Chocolatey](https://chocolatey.org/) to install some apps like [FSLogix](https://docs.microsoft.com/en-us/fslogix/overview) for user profile support and Visual Studio 2022 for .NET dvelopment. We'll also use a custom PowerShell script to install [Azure PowerShell](https://github.com/Azure/azure-powershell).

Finally, we'll [schedule a GitHub Actions workflow](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule) executing our Packer build. We'll query Azure daily for a new Windows release and create a new Packer image in case of a new release.

As usual, [all the code is available on GitHub](https://github.com/schnerring/packer-windows-avd).

## Prepare Packer Resources with Terraform

Before being able to use Packer, we have to create some resources. To do so, we could use the Azure CLI or the Azure Portal. I like using Terraform.

### Resource Groups

First we create two resource groups:

```hcl
resource "azurerm_resource_group" "packer_artifacts" {
  name     = "packer-artifacts-rg"
  location = "Switzerland North"
}

resource "azurerm_resource_group" "packer_build" {
  name     = "packer-build-rg"
  location = "Switzerland North"
}
```

[Packer's Azure ARM builder](https://www.packer.io/plugins/builders/azure/arm) uses the `packer-build-rg` resource group to provision the required build resources and should only contain resources during build time.
Packer will publish the resulting [managed images](https://docs.microsoft.com/en-us/azure/virtual-machines/windows/capture-image-resource) to the `packer-artifacts-rg` resource group.

### Authentication and Authorization

We'll use SP authentication with Packer because it integrates well with GitHub Actions. We create it like this:

```hcl
resource "azuread_application" "packer" {
  display_name = "packer-sp-app"
}

resource "azuread_service_principal" "packer" {
  application_id = azuread_application.packer.application_id
}

resource "azuread_service_principal_password" "packer" {
  service_principal_id = azuread_service_principal.packer.id
}
```

To authorize the SP to manage resources inside the resource groups we created, we use [role-based access control (RBAC)](https://docs.microsoft.com/en-us/azure/role-based-access-control/overview) and assign the SP the `Contributor` role, scoped to the resource groups:

```hcl
resource "azurerm_role_assignment" "packer_build_contributor" {
  scope                = azurerm_resource_group.packer_build.id
  role_definition_name = "Contributor"
  principal_id         = azuread_service_principal.packer.id
}

resource "azurerm_role_assignment" "packer_artifacts_contributor" {
  scope                = azurerm_resource_group.packer_artifacts.id
  role_definition_name = "Contributor"
  principal_id         = azuread_service_principal.packer.id
}
```

### Export GitHub Actions Secrets

To make the credentials accessible to GitHub Actions, we export them as secrets like this:

```hcl
resource "github_actions_secret" "packer_client_id" {
  repository      = data.github_repository.packer_windows_11_avd.name
  secret_name     = "PACKER_CLIENT_ID"
  plaintext_value = azuread_application.packer.application_id
}

resource "github_actions_secret" "packer_client_secret" {
  repository      = data.github_repository.packer_windows_11_avd.name
  secret_name     = "PACKER_CLIENT_SECRET"
  plaintext_value = azuread_service_principal_password.packer.value
}

resource "github_actions_secret" "packer_subscription_id" {
  repository      = data.github_repository.packer_windows_11_avd.name
  secret_name     = "PACKER_SUBSCRIPTION_ID"
  plaintext_value = data.azurerm_subscription.subscription.subscription_id
}

resource "github_actions_secret" "packer_tenant_id" {
  repository      = data.github_repository.packer_windows_11_avd.name
  secret_name     = "PACKER_TENANT_ID"
  plaintext_value = data.azurerm_subscription.subscription.tenant_id
}
```

We'll also make use of the [Azure Login Action](https://github.com/Azure/login#configure-a-service-principal-with-a-secret) to dynamically query the latest Windows version available on Azure with the [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/). It [expects credentials as JSON](https://github.com/Azure/login#configure-a-service-principal-with-a-secret):

```json
{
  "clientId": "<GUID>",
  "clientSecret": "<GUID>",
  "subscriptionId": "<GUID>",
  "tenantId": "<GUID>"
}
```

```hcl
resource "github_actions_secret" "github_actions_azure_credentials" {
  repository  = data.github_repository.packer_windows_11_avd.name
  secret_name = "AZURE_CREDENTIALS"

  plaintext_value = jsonencode(
    {
      clientId       = azuread_application.packer.application_id
      clientSecret   = azuread_service_principal_password.packer.value
      subscriptionId = data.azurerm_subscription.subscription.subscription_id
      tenantId       = data.azurerm_subscription.subscription.tenant_id
    }
  )
}
```

## Get the Latest Windows 11 Version Available On Azure

We can use the Azure CLI to query the available Windows versions on Azure like this:

```bash
az vm image list \
  --publisher MicrosoftWindowsDesktop \
  --offer office-365 \
  --sku win11-21h2-avd-m365 \
  --all
```

If you prefer using a Windows 11 base image without Office 365, use `--offer windows-11` and `--sku win11-21h2-avd` instead. You can discover more images using the Azure CLI commands `az vm image list-publishers`, `az vm image list-offers`, and `az vm image list-skus`.

## Packer

Create a Packer template file named `windows.pkr.hcl` and add the following variables to it:

```hcl
variable "client_id" {
  type        = string
  description = "Azure Service Principal App ID."
  sensitive   = true
}

variable "client_secret" {
  type        = string
  description = "Azure Service Principal Secret."
  sensitive   = true
}

variable "subscription_id" {
  type        = string
  description = "Azure Subscription ID."
  sensitive   = true
}

variable "tenant_id" {
  type        = string
  description = "Azure Tenant ID."
  sensitive   = true
}

variable "artifacts_resource_group" {
  type        = string
  description = "Packer Artifacts Resource Group."
}

variable "build_resource_group" {
  type        = string
  description = "Packer Build Resource Group."
}

variable "source_image_publisher" {
  type        = string
  description = "Windows Image Publisher."
}

variable "source_image_offer" {
  type        = string
  description = "Windows Image Offer."
}

variable "source_image_sku" {
  type        = string
  description = "Windows Image SKU."
}

variable "source_image_version" {
  type        = string
  description = "Windows Image Version."
}
```

Besides the resource group names and SP credentials we created earlier with Terraform, we also define four additional variables allowing us to specify the base image we want to use.

## GitHub Actions

[Microsoft releases monthly quality updates for Windows](https://docs.microsoft.com/en-us/windows/deployment/update/quality-updates#quality-updates). Unofficially that day is called _Patch Tuesday_, the second Tuesday of each month. However, if there's an exceptional need, like a critical security vulnerability, Microsoft can provide a release outside of the monthly schedule.