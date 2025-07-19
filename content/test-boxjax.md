+++
title = "BoxJax Test"
date = 2023-01-01
boxjax = true
+++

# Testing BoxJax with tcolorbox

This page tests the BoxJax integration.

<script type="text/tcolorbox">
\begin{tcolorbox}[
  title=Test Box,
  colback=blue!5!white,
  colframe=blue!75!black,
  colbacktitle=blue!75!black,
  coltitle=white
]
  This is a tcolorbox rendered directly in the browser using BoxJax.
  
  You can include math: $E = mc^2$
  
  And format text with \textbf{bold} or \textit{italic}.
\end{tcolorbox}
</script>

## Simple example

<script type="text/tcolorbox">
\begin{tcolorbox}
  Plain tcolorbox without options.
\end{tcolorbox}
</script>
