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
};

class Cell {
  constructor(parentCell, angleSign) {
    this.isRoot = !parentCell;
    this.children = [];
    this.leaf = Vector.rotate([10, 0], Math.random() * 2 * Math.PI);
    this.showLeaf = false;

    if (this.isRoot) {
      this.maxOrder = 10;
      this.order = 0;
      this.body = [0, -1];
      this.thickness = 1;
      this.maxLength = 40 + 40 * Math.random();
    } else {
      this.maxOrder = Math.floor(5 + 20 * Math.random());
      this.parentCell = parentCell;
      this.thickness = Math.max(1, 0.7 * parentCell.thickness);
      this.maxLength = (3 + 20 * Math.random()) * this.thickness;
      this.order = parentCell.order + 1;
      const absoluteAngle = 0.5 + 0 * Math.random() ** 2;
      const angle = angleSign * absoluteAngle;
      this.body = Vector.rotate(Vector.normalise(parentCell.body), angle);
    }
    this.maxThickness = Math.max(1, 8 - this.order * 1);
  }
}

function growCell(cell) {
  const length = Vector.length(cell.body);
  if (cell.thickness < cell.maxThickness) cell.thickness += 0.05;
  if (cell.order < cell.maxOrder) {
    if (length < cell.maxLength) {
      cell.body = Vector.stretchBy(cell.body, 0.5);
    }

    if (length > 5 && cell.children.length <= 0) {
      const angleSign = Math.random() > 0.5 ? 1 : -1;
      const newCell = new Cell(cell);
      newCell.body = Vector.rotate(
        Vector.normalise(cell.body),
        Math.random() * 0.4 * angleSign
      );
      cell.children.push(newCell);
      if (Math.random() > 0.3) {
        cell.children.push(new Cell(cell, -angleSign));
      }
    }
  }
  cell.showLeaf = cell.thickness < 2;

  const leafRotateAngle = (Math.random() - 0.5) * 0.5;
  cell.leaf = Vector.rotate(cell.leaf, leafRotateAngle);

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
    const leafEnd = [endPoint[0] + cell.leaf[0], endPoint[1] + cell.leaf[1]];
    ctx.strokeStyle = 'green';
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.moveTo(...endPoint);
    ctx.lineTo(...leafEnd);
    ctx.closePath();
    ctx.lineWidth = 10;
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
}, 100);
