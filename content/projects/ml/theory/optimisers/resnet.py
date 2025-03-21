import torch
import torch.nn as nn
import torch.optim as optim
import torchvision
import torchvision.transforms as transforms
import matplotlib.pyplot as plt
from torchvision.models import resnet18
import numpy as np

# Device Configuration
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Data Transformations
transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize((0.5,), (0.5,))
])

# Load CIFAR-10
trainset = torchvision.datasets.CIFAR10(root='./data', train=True, download=True, transform=transform)
trainloader = torch.utils.data.DataLoader(trainset, batch_size=256, shuffle=True, num_workers=2)  # Doubled batch size

testset = torchvision.datasets.CIFAR10(root='./data', train=False, download=True, transform=transform)
testloader = torch.utils.data.DataLoader(testset, batch_size=256, shuffle=False, num_workers=2)  # Doubled batch size

# Define Model
model = resnet18(weights=None)  # No pretrained weights
model.fc = nn.Linear(512, 10)  # Adjust final layer for 10 classes
model = model.to(device)

# Loss Function
criterion = nn.CrossEntropyLoss()

# Define Optimizers
optimizers = {
    "SGD": optim.SGD(model.parameters(), lr=0.01, momentum=0.9),
    "Adam": optim.Adam(model.parameters(), lr=0.001),
    "RMSprop": optim.RMSprop(model.parameters(), lr=0.001),
    "Adagrad": optim.Adagrad(model.parameters(), lr=0.01)
}

# Training Parameters
epochs = 10
# Store loss and accuracy for plotting, with batch-level granularity
history = {name: {'loss': [], 'accuracy': []} for name in optimizers}

def compute_accuracy(outputs, labels):
    _, predicted = torch.max(outputs.data, 1)
    total = labels.size(0)
    correct = (predicted == labels).sum().item()
    return correct / total

# Training Loop
for name, optimizer in optimizers.items():
    print(f"\nTraining with {name} optimizer...")
    model.apply(lambda m: m.reset_parameters() if hasattr(m, "reset_parameters") else None)  # Reset weights
    
    batch_count = 0
    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        running_accuracy = 0.0
        samples_counted = 0
        
        for images, labels in trainloader:
            images, labels = images.to(device), labels.to(device)

            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            # Compute accuracy
            accuracy = compute_accuracy(outputs, labels)
            
            # Accumulate metrics
            running_loss += loss.item()
            running_accuracy += accuracy
            samples_counted += 1
            
            # Store averaged metrics every 2 batches
            if samples_counted == 2:
                history[name]['loss'].append(running_loss / 2)
                history[name]['accuracy'].append(running_accuracy / 2)
                running_loss = 0.0
                running_accuracy = 0.0
                samples_counted = 0
                
                batch_count += 1
                if batch_count % 25 == 0:  # Print less frequently since we're averaging
                    print(f"Epoch [{epoch+1}/{epochs}], Batch [{batch_count}], "
                          f"Loss: {history[name]['loss'][-1]:.4f}, "
                          f"Accuracy: {history[name]['accuracy'][-1]:.4f}")

# Create subplots for loss and accuracy
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 5))

# Plot Loss with moving average
window = 5  # Window size for moving average
for name, metrics in history.items():
    losses = metrics['loss']
    # Calculate moving average
    smoothed_losses = np.convolve(losses, np.ones(window)/window, mode='valid')
    ax1.plot(smoothed_losses, label=name)
ax1.set_xlabel("Batches (averaged)")
ax1.set_ylabel("Loss")
ax1.set_title("Training Loss (Moving Average)")
ax1.legend()
ax1.grid(True)

# Plot Accuracy with moving average
for name, metrics in history.items():
    accuracies = metrics['accuracy']
    # Calculate moving average
    smoothed_accuracies = np.convolve(accuracies, np.ones(window)/window, mode='valid')
    ax2.plot(smoothed_accuracies, label=name)
ax2.set_xlabel("Batches (averaged)")
ax2.set_ylabel("Accuracy")
ax2.set_title("Training Accuracy (Moving Average)")
ax2.legend()
ax2.grid(True)

plt.tight_layout()
plt.savefig("training_metrics.png")
plt.close()

