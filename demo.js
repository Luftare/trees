const canvas = document.querySelector('.demo');
const ctx = canvas.getContext('2d');

ctx.lineCap = 'round';

canvas.width = innerWidth;
canvas.height = 600;

const Vector = {
  rotate([x, y], angle) {
    const s = Math.sin(angle);
    const c = Math.cos(angle);
    const nX = x * c - y * s;
    const nY = x * s + y * c;
    return [nX, nY];
  },
  scale(vector, scalar) {
    return vector.map(val => val * scalar);
  },
  length([x, y]) {
    return Math.sqrt(x ** 2 + y ** 2);
  },
  stretchBy(vector, scalar) {
    const newLength = this.length(vector) + scalar;
    return this.scale(this.normalise(vector), newLength);
  },
  normalise(vector) {
    const length = this.length(vector);
    return vector.map(val => val / length);
  },
  dot(a, b) {
    return a[0] * b[0] + a[1] * b[1];
  },
  cross(a, b) {
    return a[0] * b[1] - a[1] * b[0];
  }
};

function childBranchCount(cell) {
  return (
    cell.children.reduce((acc, child) => acc + childBranchCount(child), 0) +
    cell.children.length
  );
}

function childrenWeight(cell) {
  return (
    cell.children.reduce((acc, child) => acc + childrenWeight(child), 0) +
    cell.thickness * cell.length
  );
}

function childrenLeafs(cell) {
  return (
    (cell.showLeaf ? 1 : 0) +
    cell.children.reduce(
      (acc, child) => acc + childrenLeafs(child) + (child.showLeaf ? 1 : 0),
      0
    )
  );
}

let sunRay = Vector.rotate([0, 1], (0 * Math.PI) / 180);
const gravityNormal = [1, 0];

const defaultGenome = {
  bodyBendingTendency: 0.5,
  branchingTendency: 0.5,
  elasticity: 0.5,
  branchAngularTendency: 0.5,
  branchCutSurvivability: 0.5,
  growthSpeed: 0.5,
  strength: 0.5,
  size: 0.5
};

function mutateGenome(genome, amount = 0.7) {
  const mutatedGenome = {};
  for (let propName in genome) {
    mutatedGenome[propName] = Math.min(
      1,
      Math.max(0.001, genome[propName] + (Math.random() - 0.5) * amount)
    );
  }
  return mutatedGenome;
}

class Cell {
  constructor(parentCell, branchingAngle = 0, genome) {
    this.isRoot = !parentCell;
    this.x = 0;
    this.y = 0;
    this.leafX = 0;
    this.leafY = 0;
    this.deadCycles = 0;

    if (this.isRoot) {
      const mutateAmount = genome ? 0.05 : 1;
      this.genome = mutateGenome(genome || defaultGenome, mutateAmount);
      Object.assign(this, this.genome);
      this.maxOrder = 40 * this.size;
      this.order = 0;
      this.body = [0, -1];
      this.thickness = 1;
      this.maxLength = 10 + 40 * Math.random();
    } else {
      this.genome = parentCell.genome;
      Object.assign(this, this.genome);
      this.parentCell = parentCell;
      this.thickness = Math.max(1, 0.1 * parentCell.thickness);
      this.order = parentCell.order + 1;
      this.maxLength =
        (Math.random() * 200) / (2 + this.order * this.branchingTendency);
      this.body = Vector.rotate(
        Vector.normalise(parentCell.body),
        branchingAngle
      );
      this.maxOrder = parentCell.maxOrder + Math.random() * 0.5;
    }
    this.dead = false;
    this.children = [];
    const leafAngle = (Math.random() - 0.5) * 0.1;
    this.leaf = Vector.rotate(Vector.normalise(this.body), leafAngle);
    this.leafSide = Math.random() > 0.5 ? 1 : -1;
    this.leafSize = 5 + Math.random() * 5 + this.order * 0.5;
    this.showLeaf = true;
    this.length = 1;
  }
}

function cutCellChildren(cell) {
  cell.children = [];
  cell.dead = Math.random() > cell.branchCutSurvivability;
  if (
    cell.dead &&
    Math.random() > cell.branchCutSurvivability &&
    cell.parentCell
  ) {
    if (cell.parentCell) {
      cutCellChildren(cell.parentCell);
    }
  }
}

function killBranches(cell) {
  cell.dead = true;
  cell.children.forEach(child => killBranches(child));
}

function getRoot(cell) {
  return cell.parentCell ? getRoot(cell.parentCell) : cell;
}

function growCell(cell) {
  const leafCount = childrenLeafs(cell);
  const childBranches = childBranchCount(cell);

  if (cell.isRoot) {
    if (!cell.dead && leafCount <= 0) {
      killBranches(cell);
    }

    if (childBranches > 5 && Math.random() > 0.995 && seeds.length < 500) {
      const root = getRoot(cell);
      const x = Math.max(
        0,
        Math.min(innerWidth, root.x + (Math.random() - 0.5) * 500)
      );
      const y = root.y;
      const newCell = new Cell(null, 0, cell.genome);
      newCell.x = x;
      newCell.y = y;
      seeds.push(newCell);
    }
  }
  if (cell.dead) {
    cell.deadCycles++;
    if (cell.parentCell && Math.random() > 0.995) {
      killBranches(cell.parentCell);
    }
  } else {
    const shade = getShadeAt(cell.leafX, cell.leafY);
    cell.length = Vector.length(cell.body);

    const weight = childrenWeight(cell);
    const bodyTorque = Math.abs(Vector.dot([1, 0], cell.body));
    const bodyStress = weight * bodyTorque;
    const bodyStrength = cell.thickness * cell.strength * 40000;

    cell.showLeaf = !cell.dead && cell.thickness < 5;
    const normalisedLeaf = Vector.normalise(cell.leaf);
    const leafSunDot = Vector.dot(normalisedLeaf, sunRay);
    const leafSunPlaneSize = Math.max(0, -leafSunDot);
    const growthFactor = Math.max(
      0,
      leafSunPlaneSize * (cell.showLeaf ? 0.2 : 0) - shade * 0.5
    );

    cell.thickness += (leafCount / weight) * 0.1;
    const willCutChildren =
      bodyStress > bodyStrength ||
      leafCount <= 0 ||
      shade > 40 ||
      cell.leafY > canvas.height ||
      (cell.isRoot && !cell.showLeaf && cell.children.length === 0);

    if (willCutChildren) {
      killBranches(cell);
    }
    if (cell.showLeaf) cell.body = Vector.stretchBy(cell.body, growthFactor);

    if (cell.order < cell.maxOrder) {
      const willBranch =
        (cell.branchingTendency * cell.length) / (10 + cell.order) > 1 &&
        cell.children.length <= 0;
      if (willBranch) {
        const angleSign = Math.random() > 0.5 ? 1 : -1;
        const bodyAngle = Math.random() * cell.bodyBendingTendency * angleSign;
        cell.children.push(new Cell(cell, bodyAngle));
        if (Math.random() < cell.branchingTendency + 0.2) {
          const branchAngle =
            -Math.random() *
            Math.PI *
            0.5 *
            cell.branchAngularTendency *
            angleSign;
          cell.children.push(new Cell(cell, branchAngle));
        }
      }
    }

    //bend
    const bendDirection = cell.body[0] > 0 ? 1 : -1;
    const bendAmount =
      cell.elasticity *
      (bodyStress / bodyStrength) *
      0.0001 *
      Math.abs(Vector.dot(gravityNormal, cell.body)) *
      bendDirection;
    cell.body = Vector.rotate(cell.body, bendAmount);

    cell.children.forEach(childCell => {
      growCell(childCell);
    });

    //shake
    const rotateAmount =
      (cell.elasticity * 1.5) /
      (0.3 + cell.thickness * 15 + leafSunPlaneSize * 20);
    const bodyRotateAngle = (Math.random() - 0.5) * rotateAmount;
    cell.body = Vector.rotate(cell.body, bodyRotateAngle);
  }
}

function drawCell(x, y, cell) {
  const endPoint = [x + cell.body[0], y + cell.body[1]];
  const redValue = Math.min(4000 / (cell.thickness + 100), 250);
  const greenValue = Math.min(3000 / (cell.thickness + 50), 250);
  ctx.strokeStyle = cell.dead ? '#f00' : `rgb(${redValue},${greenValue},0)`;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(...endPoint);
  ctx.closePath();
  ctx.lineCap = 'round';
  ctx.lineWidth = cell.thickness;
  ctx.stroke();

  cell.leafX = endPoint[0];
  cell.leafY = endPoint[1];
  if (cell.showLeaf && !cell.dead) {
    const shadowIndex = getShadowIndex(cell.leafX);
    shadows[shadowIndex].push(cell.leafY);

    const leaf = Vector.scale(
      Vector.rotate(cell.leaf, (cell.leafSide * Math.PI) / 2),
      cell.leafSize
    );
    const leafEnd = [endPoint[0] + leaf[0], endPoint[1] + leaf[1]];
    ctx.strokeStyle = 'green';
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.moveTo(...endPoint);
    ctx.lineTo(...leafEnd);
    ctx.closePath();
    ctx.lineWidth = cell.leafSize * 0.4;
    ctx.stroke();
  }

  cell.children.forEach(childCell => {
    drawCell(...endPoint, childCell);
  });
}

const shadowsCount = 400;

function getShadeAt(x, y) {
  const index = getShadowIndex(x);
  const shadowColumn = shadows[index];
  return shadowColumn.reduce((acc, num) => (num < y ? acc + 1 : acc), 0);
}

function getShadowIndex(x) {
  const shadowWidth = innerWidth / shadowsCount;
  return Math.min(shadowsCount - 1, Math.max(0, Math.floor(x / shadowWidth)));
}

function resetShadows() {
  shadows = shadows.map(() => []);
}

let shadows = [...Array(shadowsCount)].map(() => []);

const startSeedsCount = 5;

let seeds = [...Array(startSeedsCount)].map((_, i) => {
  const x = ((i + 0.5) / startSeedsCount) * innerWidth;
  const y = canvas.height;
  const seed = new Cell();
  seed.x = x;
  seed.y = y;
  return seed;
});

setInterval(() => {
  canvas.width = canvas.width;
  seeds = seeds.filter(seed => seed.deadCycles < 100);
  seeds.forEach(seed => {
    growCell(seed);
  });
  resetShadows();
  seeds.forEach(seed => {
    drawCell(seed.x, seed.y, seed);
  });
}, 20);
