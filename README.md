# PetMediSearch

**주의**: 아직 네이버 클라우드에 DB를 올리지 않았습니다. 코드를 실행해보고 싶으신 분들은 데이터를 로컬 MySQL Workbench 테이블에 직접 넣으셔야 합니다.

1.docker로 서버 활성화 및 db생성
먼저 Docker를 사용하여 서버를 활성화하고, 다음 설정으로 데이터베이스를 생성합니다:

```yaml
host: 'localhost'
port: 3306
user: 'root'
password: 'password'
database: 'petmedisearch'

2.해당 sql문으로 테이블을 만들어주시고
CREATE TABLE medical_facilities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mgtno VARCHAR(255) NOT NULL,
    bplcnm VARCHAR(255) NOT NULL,
    sitewhladdr TEXT,
    rdnwhladdr TEXT,
    sitetel VARCHAR(20),
    x DECIMAL(18, 6),
    y DECIMAL(18, 6),
    apvpermymd DATE,
    dcbymd DATE,
    dtlstatenm VARCHAR(50),
    trdstatenm VARCHAR(50),
    type ENUM('약국', '병원') NOT NULL,
    lastmodts TIMESTAMP,
    UNIQUE KEY (mgtno, type)

);

3.터미널에서 cd server로 이동하시고 node importData.js로 data를 테이블에 넣어줍니다.

4.npm run start로 돌려주고 localhost:8080/search로 들어가주시면 됩니다.

