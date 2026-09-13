const fs = require('fs');
const mysql = require('mysql2/promise');
const path = require('path');

const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'password',
  database: 'petmedisearch',
};

function validateAndConvert(value, type) {
  if (type === 'x' || type === 'y') {
    const num = parseFloat(value);
    return isNaN(num) ? null : num.toFixed(6);
  }
  if (type === 'date') {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  }
  return value;
}

async function insertData(filePath, type) {
  const absoluteFilePath = path.resolve(__dirname, filePath);
  console.log(`Attempting to read file: ${absoluteFilePath}`);
  
  if (!fs.existsSync(absoluteFilePath)) {
    console.error(`File not found: ${absoluteFilePath}`);
    return;
  }

  const connection = await mysql.createConnection(dbConfig);
  await connection.beginTransaction();

  try {
    const fileContent = fs.readFileSync(absoluteFilePath, 'utf8');
    const jsonData = JSON.parse(fileContent);

    console.log(`Total records in file: ${jsonData.DATA.length}`);

    let insertedCount = 0;
    let updatedCount = 0;

    for (const item of jsonData.DATA) {
      const query = `
        INSERT INTO medical_facilities 
        (mgtno, bplcnm, sitewhladdr, rdnwhladdr, sitetel, x, y, apvpermymd, dcbymd, dtlstatenm, trdstatenm, type, lastmodts) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        bplcnm = VALUES(bplcnm), sitewhladdr = VALUES(sitewhladdr), rdnwhladdr = VALUES(rdnwhladdr), 
        sitetel = VALUES(sitetel), x = VALUES(x), y = VALUES(y), apvpermymd = VALUES(apvpermymd), 
        dcbymd = VALUES(dcbymd), dtlstatenm = VALUES(dtlstatenm), trdstatenm = VALUES(trdstatenm), 
        lastmodts = VALUES(lastmodts)
      `;

      const values = [
        item.mgtno,
        item.bplcnm,
        item.sitewhladdr,
        item.rdnwhladdr,
        item.sitetel,
        validateAndConvert(item.x, 'x'),
        validateAndConvert(item.y, 'y'),
        validateAndConvert(item.apvpermymd, 'date'),
        validateAndConvert(item.dcbymd, 'date'),
        item.dtlstatenm,
        item.trdstatenm,
        type,
        validateAndConvert(item.lastmodts, 'date')
      ];

      const [result] = await connection.execute(query, values);
      if (result.affectedRows > 0) {
        if (result.insertId) {
          insertedCount++;
        } else {
          updatedCount++;
        }
      }
    }

    await connection.commit();

    console.log(`Data insertion completed for ${type}`);
    console.log(`Inserted records: ${insertedCount}`);
    console.log(`Updated records: ${updatedCount}`);
    console.log(`Total affected records: ${insertedCount + updatedCount}`);
  } catch (error) {
    await connection.rollback();
    /*
     * errorCount++ 가 있었는데 그 변수는 위 try 블록 안에서 선언돼 여기서는
     * 보이지 않았습니다. 적재가 실패하면 이 catch 자체가 ReferenceError 로 터져
     * 진짜 원인이 가려졌습니다. 세기만 하고 아무도 읽지 않던 값이라 지웁니다.
     */
    console.error('적재 실패:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

// 데이터 삽입
insertData('../data/Seoul_Pharmacy_data.json', '약국')
  .then(() => {
    return insertData('../data/Seoul_Hospital_data.json', '병원');
  })
  .catch(error => {
    console.error('An error occurred:', error);
  });
