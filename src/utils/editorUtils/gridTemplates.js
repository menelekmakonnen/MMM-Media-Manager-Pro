function getGridLayout(numItems, format) {
  if (numItems < 2) numItems = 2;
  if (numItems > 12) numItems = 12;
  let cols = 1;
  let rows = 1;
  if (numItems === 2) {
    if (format === "vertical") {
      rows = 2;
      cols = 1;
    } else {
      rows = 1;
      cols = 2;
    }
  } else if (numItems === 3) {
    if (format === "vertical") {
      rows = 3;
      cols = 1;
    } else if (format === "horizontal") {
      rows = 1;
      cols = 3;
    } else {
      rows = 2;
      cols = 2;
    }
  } else if (numItems === 4) {
    if (format === "horizontal") {
      rows = 1;
      cols = 4;
    } else if (format === "vertical") {
      rows = 4;
      cols = 1;
    } else {
      rows = 2;
      cols = 2;
    }
  } else if (numItems <= 6) {
    if (format === "horizontal") {
      rows = 2;
      cols = 3;
    } else if (format === "vertical") {
      rows = 3;
      cols = 2;
    } else {
      rows = 2;
      cols = 3;
    }
  } else if (numItems <= 8) {
    if (format === "horizontal") {
      rows = 2;
      cols = 4;
    } else if (format === "vertical") {
      rows = 4;
      cols = 2;
    } else {
      rows = 3;
      cols = 3;
    }
  } else if (numItems <= 9) {
    rows = 3;
    cols = 3;
  } else if (numItems <= 12) {
    if (format === "horizontal") {
      rows = 3;
      cols = 4;
    } else if (format === "vertical") {
      rows = 4;
      cols = 3;
    } else {
      rows = 3;
      cols = 4;
    }
  }
  const layouts = [];
  const cellWidth = 1 / cols;
  const cellHeight = 1 / rows;
  for (let i = 0; i < numItems; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    let width = cellWidth;
    let x = col * cellWidth;
    const itemsInThisRow = row === rows - 1 ? numItems % cols || cols : cols;
    if (itemsInThisRow < cols && row === rows - 1) {
      width = 1 / itemsInThisRow;
      x = i % itemsInThisRow * width;
    }
    layouts.push({
      x,
      y: row * cellHeight,
      width,
      height: cellHeight
    });
  }
  return layouts;
}
export {
  getGridLayout
};
