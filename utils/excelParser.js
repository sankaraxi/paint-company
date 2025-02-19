const xlsx = require("xlsx");

exports.parseExcel = async (file) => {
    try {
        const workbook = xlsx.readFile(file.path || file.tempFilePath);
        const sheetNames = workbook.SheetNames;
        const data = {};

        for (const sheetName of sheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const sheetData = xlsx.utils.sheet_to_json(worksheet);

            if (sheetData.length > 0) {
                data[sheetName] = sheetData;
            }
        }

        // Log the parsed data in the backend console
        console.log("Parsed Excel Data:", JSON.stringify(data, null, 2));

        return data;
    } catch (error) {
        console.error("Error parsing Excel file:", error);
        throw new Error(`Error parsing Excel file: ${error.message}`);
    }
};













