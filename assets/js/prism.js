import Prism from "prismjs";

{{ range $.Site.Params.prism.languages }}
  import "prismjs/components/prism-{{ . }}";
{{ end }}

{{ range $.Site.Params.prism.plugins }}
  import "prismjs/plugins/{{ . }}/prism-{{ . }}";
{{ end }}

const alias = "jupyter-python";
Prism.languages[alias] = Prism.languages.python;
Prism.highlightAll();
