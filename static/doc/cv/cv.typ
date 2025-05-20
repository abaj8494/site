
#import "@preview/drafting:0.2.2": *
#import "@preview/thmbox:0.2.0": *
#import "@preview/marge:0.1.0": sidenote
#import "@preview/hydra:0.6.1": hydra
#show link: set text(fill: blue)
#show link: underline
#show math.equation.where(block: false): it => box(
  it,            // keep the original math
  height: auto,
  // debug:
  //fill: red, 
  //stroke: blue
)
//#show math.equation.where(block: false): math.equation.with(block: true)
#show: thmbox-init(counter-level: 2)

#let def-counter = counter("def")
#show: sectioned-counter(def-counter, level: 3)

#let defbox = note.with(
  numbering: "1.1.1",
  counter: def-counter,          
  fill: rgb("#f8f8f8"),
  border: (paint: rgb("#787878"), thickness: 0.8pt),
  radius: 3pt,
  inset: (x: 0.8em, y: 0.6em),
)

#let iff = $<==>$
#let imp = $==>$
#let ve(body) = {
  $op(upright(bold(body)))$
}
#let abs(body) = $bar.v #body bar.v$
#let norm(body, p: none) = {
  if p == none {
    $bar.v.double #body bar.v.double$
  } else {
    $bar.v.double #body bar.v.double_(#p)$
  }
}
#let scr(it) = text(
  features: ("ss01",),
  box($cal(it)$),
)

#show math.equation: set text(14pt)
#set text( size: 10pt )

#show: thmbox-init()

#set document(title: "MWE CV", author: "Aayush Bajaj")

#align(center)[
  #v(2em)
  #block(text(weight: "bold", size: 24pt)[MWE CV])
  #v(2em)
  #text(weight: "bold", size: 20pt)[Aayush Bajaj]
  #v(1em)
  #text(size: 16pt)[Version 0.1]
  #v(1em)
  #text(size: 16pt)[#datetime.today().display()]
]

Hi, I meet many of your criterion, 

+ Advanced proficiency in SQL and Python
+ 3+ years of practical experience as a Data Scientist, with a focus on developing models using supervised and unsupervised learning algorithms.
+ Experience with causal uplift modelling, such as familiarity with s/x-learner meta-modelling strategies
+ Strong statistical and mathematical foundation, with experience in experimental design or A/B testing, hypothesis testing, and power analysis.
+ Solid understanding of MLOps, including CI/CD, Git operations, model productionisation, and building production pipelines.

but just in different ways then you might expect. 

I am an undergraduate CS student that has completed all the credits for my CS degree and am completing some third year math courses to enter Grad school for the Masters of Statistics.

I have come to the consensus that Machine Learning is just Statistical Learning (c.f. @hastie2009elements). I hold the Bachelor of Computer Science with a Math Major in the AI stream. At uni I undertook AI (Classical), ML, DL and CV. You are welcome to my transcript upon request.

Largely though I have spent the first half of this year underloading and becoming a Git greasemonkey, my static site in Python, Pytorch and Emacs.

Most recently I have completed Convex and Non-Convex optimisation. #link("https://github.com/abaj8494/math")[This] is my Mathematics repo.

You may enter the portal from here:#box[#link("https://abaj.ai/")[#image("abs.svg", width: 5%)]] or via my Github: #box[#link("https://github.com/abaj8494")[#image("github.svg", width: 5%)]]

but what I lack in work experience I make it up with #link("https://abaj.ai/words")[theoretical background]. 

I also play Ultimate Frisbee and know how to integrate myself within teams. We also did lots of group projects in school.


Regards,

Aayush


You may reach me on 0481 910 408 for an interview.

#bibliography("refs.bib")
