const canvas = document.querySelector('.demo');
const ctx = canvas.getContext('2d');

ctx.lineCap = 'round';

canvas.width = innerWidth;
canvas.height = innerHeight;

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
  },
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
  return cell.children.reduce((acc, child) => acc + childrenLeafs(child), 0) +
    cell.showLeaf
    ? 1
    : 0;
}

let sunRay = Vector.rotate([0, 1], (0 * Math.PI) / 180);
const gravityNormal = [1, 0];

class Cell {
  constructor(parentCell, branchingAngle = 0) {
    this.isRoot = !parentCell;
    this.x = null;
    this.y = null;

    this.bodyBendingTendency = 0.5;
    this.branchingTendency = 0.5;
    this.elasticity = 0.5;
    this.branchAngularTendency = 0.5;
    this.branchCutSurvivability = 0.5;
    this.growthSpeed = 0.5;
    this.strength = 0.5;

    if (this.isRoot) {
      this.maxOrder = 20;
      this.order = 0;
      this.body = [0, -1];
      this.thickness = 1;
      this.maxLength = 10 + 40 * Math.random();
    } else {
      this.parentCell = parentCell;
      this.thickness = Math.max(1, 0.1 * parentCell.thickness);
      this.order = parentCell.order + 1;
      this.maxLength = (Math.random() * 300) / (2 + this.order);
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

function growCell(cell) {
  const leafCount = childrenLeafs(cell) + cell.showLeaf ? 1 : 0;

  if (cell.isRoot && !cell.dead && leafCount <= 0) {
    killBranches(cell);
  }
  if (cell.dead) {
    cell.thickness = Math.max(1, cell.thickness - 0.002);
    cell.body = Vector.scale(cell.body, 0.995);
  } else {
    this.length = Vector.length(cell.body);

    const weight = childrenWeight(cell);
    const bodyTorque = Math.abs(Vector.dot([1, 0], cell.body));
    const bodyStress = weight * bodyTorque;
    const bodyStrength = cell.thickness * cell.strength * 7000;

    const willCutChildren = bodyStress > bodyStrength || leafCount <= 0;

    if (willCutChildren) {
      cutCellChildren(cell);
    }

    cell.showLeaf = cell.thickness < 3.5;
    const normalisedLeaf = Vector.normalise(cell.leaf);
    const leafSunDot = Vector.dot(normalisedLeaf, sunRay);
    const leafSunPlaneSize = Math.max(0, -leafSunDot);

    const growthScale = cell.showLeaf ? leafSunPlaneSize : 0;
    cell.thickness += 0.004 * leafCount;
    if (this.length < cell.maxLength)
      cell.body = Vector.stretchBy(
        cell.body,
        0.5 * cell.growthSpeed * growthScale
      );

    if (cell.order < cell.maxOrder) {
      if (
        this.length > 3 &&
        cell.children.length <= 0 &&
        cell.thickness > 1.8
      ) {
        const angleSign = Math.random() > 0.5 ? 1 : -1;
        const bodyAngle = Math.random() * cell.bodyBendingTendency * angleSign;
        cell.children.push(new Cell(cell, bodyAngle));
        if (Math.random() < cell.branchingTendency) {
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
      (weight / bodyStrength) *
      0.0008 *
      Math.abs(Vector.dot(gravityNormal, cell.body)) *
      bendDirection;
    cell.body = Vector.rotate(cell.body, bendAmount);

    cell.children.forEach(childCell => {
      growCell(childCell);
    });

    //shake
    const rotateAmount =
      (cell.elasticity * 1.2) /
      (0.3 + cell.thickness * 15 + leafSunPlaneSize * 20);
    const bodyRotateAngle = (Math.random() - 0.5) * rotateAmount;
    cell.body = Vector.rotate(cell.body, bodyRotateAngle);
  }
}

function drawCell(x, y, cell) {
  const endPoint = [x + cell.body[0], y + cell.body[1]];
  const redValue = Math.min(4000 / (cell.thickness + 100), 250);
  const greenValue = Math.min(3000 / (cell.thickness + 50), 250);
  ctx.strokeStyle = cell.dead ? '#333' : `rgb(${redValue},${greenValue},0)`;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(...endPoint);
  ctx.closePath();
  ctx.lineCap = 'round';
  ctx.lineWidth = cell.thickness;
  ctx.stroke();

  if (cell.showLeaf && !cell.dead) {
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

const startSeedsCount = 2;

const seeds = [...Array(startSeedsCount)].map((_, i) => {
  const x = ((i + 0.5) / startSeedsCount) * innerWidth;
  const y = innerHeight - 100;
  const seed = new Cell();
  seed.x = x;
  seed.y = y;
  return seed;
});

setInterval(() => {
  canvas.width = canvas.width;

  seeds.forEach(seed => {
    growCell(seed);
    drawCell(seed.x, seed.y, seed);
  });
}, 10);
