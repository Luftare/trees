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

const sunRay = Vector.rotate([0, 1], (0 * Math.PI) / 180);

class Cell {
  constructor(parentCell, branchingAngle = 0) {
    this.isRoot = !parentCell;

    this.bodyBendingTendency = 0.3;
    this.branchingTendency = 0.7;
    this.branchAngularTendency = 0.7;

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
    this.maxThickness = 40 / (5 + this.order);
    this.children = [];
    const leafAngle = (Math.random() - 0.5) * 0.1;
    this.leaf = Vector.rotate(Vector.normalise(this.body), leafAngle);

    this.leafSide = Math.random() > 0.5 ? 1 : -1;
    this.leafSize = 5 + Math.random() * 5 + this.order * 0.5;
    this.showLeaf = false;
    this.length = 1;
  }
}

function growCell(cell) {
  this.length = Vector.length(cell.body);

  const weight = childrenWeight(cell);
  const bodyTorque = Math.abs(Vector.dot([1, 0], cell.body));
  const bodyStress = weight * bodyTorque;
  if (bodyStress > cell.thickness * 2000) {
    cell.children = [];
  }

  cell.showLeaf = cell.thickness < 3.5;
  const normalisedLeaf = Vector.normalise(cell.leaf);
  const leafSunDot = Vector.dot(normalisedLeaf, sunRay);
  const leafSunPlaneSize = Math.max(0, -leafSunDot);

  const growthScale = cell.showLeaf ? leafSunPlaneSize : 0;
  cell.thickness += 0.01 * (5 / (5 + cell.order));
  if (this.length < cell.maxLength)
    cell.body = Vector.stretchBy(cell.body, 0.5 * growthScale);

  if (cell.order < cell.maxOrder) {
    if (this.length > 3 && cell.children.length <= 0 && cell.thickness > 1.8) {
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

  const rotateAmount = 0.3 / (0.1 + cell.thickness * 15 + leafSunPlaneSize);

  const bodyRotateAngle = (Math.random() - 0.5) * rotateAmount;
  cell.body = Vector.rotate(cell.body, bodyRotateAngle);

  cell.children.forEach(childCell => {
    growCell(childCell);
  });
}

function drawCell(x, y, cell) {
  const endPoint = [x + cell.body[0], y + cell.body[1]];
  ctx.strokeStyle = 'black';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(...endPoint);
  ctx.closePath();
  ctx.lineCap = 'round';
  ctx.lineWidth = cell.thickness;
  ctx.stroke();

  if (cell.showLeaf) {
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

const tree = new Cell();

const x = innerWidth / 2;
const y = innerHeight - 100;

setInterval(() => {
  canvas.width = canvas.width;

  growCell(tree);
  drawCell(x, y, tree);
}, 10);
