import fs from 'fs';
import mysql from 'mysql2/promise';
import path from 'path';

import '../loadEnv.js';
import { SERVER_ROOT } from '../paths.js';
import type { ResultSetHeader } from 'mysql2/promise';
/*
 * 접속 정보는 다른 스크립트와 같이 server/.env 에서 읽습니다.
 *
 * 예전에는 localhost · root · 'password' 가 여기 박혀 있었습니다. 공개 저장소라 그 값이
 * 첫 커밋부터 누구에게나 보였고, 개발 DB 의 root 암호가 실제로 그 값이었습니다.
 * 호스트도 박혀 있어서 README 의 `docker compose exec api node dist/scripts/importData.js`
 * (DB 가 localhost 가 아니라 db 에 있음)는 한 번도 돌 수 없었습니다.
 */
const missing = ['DB_HOST', 'DB_USER', 'DB_NAME'].filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`server/.env 에 다음 값이 필요합니다: ${missing.join(', ')}`);
  process.exit(1);
}

const dbConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

/** data/*.json 의 DATA 한 건 중 적재에 쓰는 칸. 원본은 전부 문자열이고 빈 칸은 '' 입니다. */
interface FacilityRecord {
  mgtno: string;
  bplcnm: string;
  sitewhladdr: string;
  rdnwhladdr: string;
  sitetel: string;
  x: string;
  y: string;
  apvpermymd: string;
  dcbymd: string;
  dtlstatenm: string;
  trdstatenm: string;
  lastmodts: string;
}

function validateAndConvert(value: string, type: 'x' | 'y' | 'date'): string | null {
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

async function insertData(filePath: string, type: '약국' | '병원') {
  const absoluteFilePath = path.resolve(SERVER_ROOT, filePath);
  console.log(`Attempting to read file: ${absoluteFilePath}`);
  
  if (!fs.existsSync(absoluteFilePath)) {
    console.error(`File not found: ${absoluteFilePath}`);
    return;
  }

  const connection = await mysql.createConnection(dbConfig);
  await connection.beginTransaction();

  try {
    const fileContent = fs.readFileSync(absoluteFilePath, 'utf8');
    const jsonData: { DATA: FacilityRecord[] } = JSON.parse(fileContent);

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

      const [result] = await connection.execute<ResultSetHeader>(query, values);
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
    console.error('적재 실패:', (error as Error).message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

// 데이터 삽입
insertData('data/Seoul_Pharmacy_data.json', '약국')
  .then(() => {
    return insertData('data/Seoul_Hospital_data.json', '병원');
  })
  .catch(error => {
    console.error('An error occurred:', error);
  });
