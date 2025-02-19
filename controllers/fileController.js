const path = require("path");
const xlsx = require("xlsx");
const db = require("../config/dbConfig");
const fs = require('fs');

const { createTableIfNotExists } = require("../models/dynamicModel");

// Function to create the `projects` table if it does not exist
const createProjectsTable = async () => { 
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS projects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_name VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await db.execute(createTableQuery);
};

// Function to create the `sheets` table dynamically if it does not exist
const createSheetsTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS sheets (
      sheet_id INT AUTO_INCREMENT PRIMARY KEY,
      sheet_name VARCHAR(255) NOT NULL,
      project_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `;
  await db.execute(createTableQuery);
};

// Create a new project
exports.createProject = async (req, res) => {
  try {
    await createProjectsTable(); // Ensure `projects` table exists

    const { project_name } = req.body;

    if (!project_name) {
      return res.status(400).json({ message: "Project name is required" });
    }

    // Insert new project if it doesn't already exist
    const insertQuery = `INSERT INTO projects (project_name) VALUES (?);`;
    await db.execute(insertQuery, [project_name]);

    res.json({ message: "Project created successfully" });
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get all projects
exports.getProjects = async (req, res) => {
  try {
    await createProjectsTable(); // Ensure `projects` table exists

    const [projects] = await db.execute("SELECT * FROM projects;");
    res.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getFile = async (req, res) => {
  try {
      const fileName = req.params.fileName;
      const filePath = path.join(__dirname, '../uploads', fileName);
      console.log(filePath);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: 'File not found' });
      }

      // Set headers for file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

      // Create read stream and pipe to response
      res.sendFile(filePath);
  } catch (error) {
      console.error('Error fetching file:', error);
      res.status(500).json({ error: 'Error fetching file' });
  }
}

exports.getSheets = async (req, res) => {
  try {
    await createProjectsTable(); // Ensure `projects` table exists

    const [sheets] = await db.execute("SELECT * FROM sheets;");
    res.json(sheets);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Upload file and store sheets with `projectId`
exports.uploadFile = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({ message: "Project ID is required" });
    }

    // Ensure `sheets` table exists
    await createSheetsTable();

    const file = req.files.file;
    const filePath = path.join(__dirname, "../uploads", file.name);

    await file.mv(filePath); // Move file to uploads folder

    const workbook = xlsx.readFile(filePath);
    const sheets = workbook.SheetNames;

    for (const sheetName of sheets) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet);

      if (jsonData.length > 0) {
        const firstRow = jsonData[0]; // Get column headers dynamically
        await createTableIfNotExists(sheetName, firstRow);

        const tableName = sheetName.replace(/\s+/g, "_").toLowerCase();

        for (const row of jsonData) {
          const columns = Object.keys(row);
          const values = Object.values(row);

          // Construct WHERE condition dynamically
          const whereClause = columns.map(col => `\`${col}\` = ?`).join(" AND ");
          const checkQuery = `SELECT 1 FROM \`${tableName}\` WHERE ${whereClause} LIMIT 1;`;

          const [existingRows] = await db.execute(checkQuery, values);

          if (existingRows.length === 0) {
            // Insert only if no duplicate exists
            const insertQuery = `INSERT INTO \`${tableName}\` (${columns.map(col => `\`${col}\``).join(", ")}) VALUES (${columns.map(() => "?").join(", ")});`;
            await db.execute(insertQuery, values);
          }
        }

        // Insert sheet name into `sheets` table if not exists
        const checkSheetQuery = `SELECT * FROM sheets WHERE sheet_name = ? AND project_id = ? LIMIT 1;`;
        const [existingSheets] = await db.execute(checkSheetQuery, [sheetName, projectId]);

        if (existingSheets.length === 0) {
          const insertSheetQuery = `INSERT INTO sheets (sheet_name, project_id) VALUES (?, ?);`;
          await db.execute(insertSheetQuery, [sheetName, projectId]);
        }
      }
    }

     // 1. Check if the `file_name` column exists in the `projects` table
     const checkColumnQuery = `SHOW COLUMNS FROM projects LIKE 'file_name';`;
     const [columnExists] = await db.execute(checkColumnQuery);
 
     if (columnExists.length === 0) {
       // 2. If the column does not exist, add it to the `projects` table
       const addColumnQuery = `ALTER TABLE projects ADD COLUMN file_name VARCHAR(255);`;
       await db.execute(addColumnQuery);
     }
 
     // 3. Update the `file_name` column for the project with the uploaded file's name
     const updateFileNameQuery = `UPDATE projects SET file_name = ? WHERE id = ?;`;
     await db.execute(updateFileNameQuery, [file.name, projectId]);
 

    res.json({ message: "File uploaded and data inserted successfully" });
  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get all sheets by `projectId`
exports.getSheetsByProject = async (req, res) => {
  try {
    await createSheetsTable(); // Ensure `sheets` table exists
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({ message: "Project ID is required" });
    }

    const [sheets] = await db.execute("SELECT * FROM sheets WHERE project_id = ?;", [projectId]);
    res.json(sheets);
  } catch (error) {
    console.error("Error fetching sheets:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get sheet data by `sheetId`
// Get sheet data by `sheetId`
exports.getSheetById = async (req, res) => {
  try {
    await createSheetsTable(); // Ensure `sheets` table exists

    const { sheetId } = req.params;
    console.log("sheetId:", sheetId);

    if (!sheetId) {
      return res.status(400).json({ message: "Sheet ID is required" });
    }

    // Fetch the sheet name using sheetId
    const [sheet] = await db.execute("SELECT sheet_name FROM sheets WHERE sheet_id = ?;", [sheetId]);

    if (sheet.length === 0) {
      return res.status(404).json({ message: "Sheet not found" });
    }

    const sheetName = sheet[0].sheet_name.replace(/\s+/g, "_").toLowerCase(); // Normalize sheet name

    // Fetch all data from the corresponding sheet table, excluding the primary key (id)
    const [data] = await db.execute(`SELECT * FROM \`${sheetName}\`;`);

    if (data.length === 0) {
      return res.json({ message: "No data found in this sheet." });
    }

    // Remove 'id' field from each row before sending the response
    const filteredData = data.map(row => {
      const { id, ...rest } = row; // Exclude `id` field
      return rest;
    });

    res.json(filteredData);
  } catch (error) {
    console.error("Error fetching sheet data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
