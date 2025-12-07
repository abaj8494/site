- content/projects/ml/supervised/classification/perceptron/index.org
- content/projects/ml/dl/feedforward/ch4/index.org
- content/projects/ccs/dsa/structures/\_index.org
- content/projects/se/architecture-design/patterns-smells.org
- content/projects/ccs/dsa/classical/\_index.org
- content/projects/mathematics/analysis/functional/\_index.org
- content/projects/mathematics/analysis/real/fomin/index.org
- content/projects/ccs/dsa/\_index.org
- content/projects/computer-vision/\_index.org
- content/projects/mathematics/statistics/index.org
- content/projects/mathematics/probability/index.org
- content/projects/mathematics/geometry/pythag.org
- content/projects/ml/dl/feedforward/ch6/index.org
- content/projects/ml/dl/feedforward/ch1/index.org
- content/projects/ccs/comp-complexity/index.org
- content/projects/ml/dl/feedforward/ch2/index.org
- content/projects/ml/dl/feedforward/ch5/index.org

for the record

```
hugo server --baseURL https://abaj.ai --bind https://abaj.ai --appendPort=false --poll 1s --disableFastRender
```

```
rsync -vrP \
  --exclude='node_modules/' \
  --exclude='code/keychron/' \
  ~/Documents/new-site/public/ \
  root@abaj.ai:/var/www/ai/
```
