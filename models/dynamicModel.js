const db = require("../config/dbConfig");

async function createTableIfNotExists(sheetName, columns) {
  const formattedTableName = sheetName.replace(/\s+/g, "_").toLowerCase(); // Format table name
  let sql = `CREATE TABLE IF NOT EXISTS \`${formattedTableName}\` (id INT AUTO_INCREMENT PRIMARY KEY, `;

  const columnDefinitions = Object.keys(columns).map((col) => {
    const firstValue = columns[col];
    let dataType = "VARCHAR(255)"; // Default

    if (!isNaN(firstValue)) {
      dataType = Number.isInteger(Number(firstValue)) ? "INT" : "FLOAT";
    } else if (/\d{4}-\d{2}-\d{2}/.test(firstValue)) {
      dataType = "DATE";
    }

    return `\`${col}\` ${dataType}`;
  });

  sql += columnDefinitions.join(", ") + ");";

  await db.execute(sql);
}



module.exports = { createTableIfNotExists };
