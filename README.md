# AI Trip Planner

AI Trip Planner คือเว็บแอปสำหรับวางแผนทริปแบบเต็มวัน สร้างด้วย Express, Vanilla JavaScript, Tailwind CSS, Leaflet, OpenStreetMap, OpenRouteService และ Gemini API

แอปจะรับข้อมูลความต้องการเดินทางจากผู้ใช้ ให้ Gemini ช่วยสร้างกลยุทธ์การค้นหาสถานที่ ดึงข้อมูลสถานที่จาก OpenStreetMap/Nominatim คำนวณเส้นทางด้วย OpenRouteService และแสดงผลเป็น itinerary พร้อมแผนที่แบบโต้ตอบได้

## Features

- ฟอร์มวางแผนทริป: จังหวัด/เมือง, วันที่, เวลาเริ่ม-สิ้นสุด, งบประมาณ, จำนวนผู้เดินทาง และความสนใจ
- ช่องเลือกจังหวัดไทยครบ 77 จังหวัด
- ใช้ Gemini สร้างกลยุทธ์และ keyword สำหรับค้นหาสถานที่
- ค้นหาสถานที่ด้วย OpenStreetMap/Nominatim
- คำนวณระยะทางและเวลาเดินทางด้วย OpenRouteService Directions API
- แผนที่แบบโต้ตอบด้วย Leaflet และ OpenStreetMap tiles
- Timeline itinerary พร้อมเวลาเดินทางระหว่างสถานที่
- Summary รวมจำนวนจุดแวะ ระยะทางรวม และเวลาเดินทางรวม
- Mock data สำหรับจังหวัดขอนแก่น เพื่อใช้ demo ในเครื่องได้ง่าย
- Health check endpoint สำหรับตรวจการตั้งค่า API key

## Tech Stack

- Frontend: HTML, Tailwind CSS CDN, Vanilla JavaScript, Leaflet.js
- Backend: Node.js, Express.js
- AI: Gemini API
- Maps: OpenStreetMap tiles
- Places: OpenStreetMap/Nominatim
- Routing: OpenRouteService Directions API

## Project Structure

```txt
backend/
  config.js
  server.js
  services/
    gemini.service.js
    itinerary.service.js
    mockKhonKaen.service.js
    openRouteService.service.js
    osmPlaces.service.js

frontend/
  index.html
  app.js

.env.example
.gitignore
package.json
README.md
start-ai-trip-planner.bat
```

## Getting Started

ติดตั้ง dependencies:

```bash
npm install
```

สร้างไฟล์ `.env` จากไฟล์ตัวอย่าง:

```bash
cp .env.example .env
```

ถ้าใช้ Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

ใส่ API key ในไฟล์ `.env`:

```env
PORT=4000
GEMINI_API_KEY=your_gemini_api_key
ORS_API_KEY=your_openrouteservice_api_key
GEMINI_MODEL=gemini-2.0-flash
```

เริ่ม server:

```bash
npm start
```

เปิดเว็บ:

```txt
http://localhost:4000
```

ถ้าใช้ Windows สามารถดับเบิลคลิกไฟล์นี้ได้:

```txt
start-ai-trip-planner.bat
```

ระหว่างใช้งาน ให้เปิด terminal หรือ Command Prompt ค้างไว้

## Environment Variables

| ตัวแปร | จำเป็น | คำอธิบาย |
| --- | --- | --- |
| `PORT` | ไม่จำเป็น | พอร์ตของ Express server ค่าเริ่มต้นคือ `4000` |
| `GEMINI_API_KEY` | จำเป็น | API key สำหรับเรียก Gemini API |
| `ORS_API_KEY` | จำเป็น | API key สำหรับ OpenRouteService ใช้คำนวณเส้นทาง ระยะทาง และเวลาเดินทาง |
| `GEMINI_MODEL` | ไม่จำเป็น | Gemini model id ค่าเริ่มต้นคือ `gemini-2.0-flash` |

แผนที่ใช้ OpenStreetMap tiles ผ่าน Leaflet จึงไม่ต้องใช้ browser map key

## API Endpoints

### Health Check

```http
GET /api/health
```

ตัวอย่าง response:

```json
{
  "ok": true,
  "missingConfig": []
}
```

### Generate Trip Plan

```http
POST /api/plan-trip
Content-Type: application/json
```

ตัวอย่าง request:

```json
{
  "destination": "Chiang Mai",
  "travelDate": "2026-06-22",
  "startTime": "09:00",
  "endTime": "18:00",
  "budget": 3000,
  "travelers": 2,
  "interests": ["Nature", "Cafe", "Temple", "Food"]
}
```

Response จะมีข้อมูลหลัก เช่น:

- กลยุทธ์การค้นหาจาก AI
- ลำดับสถานที่ใน itinerary
- เวลาเดินทางระหว่างแต่ละจุด
- ข้อมูลเวลาเปิด-ปิดเมื่อมีข้อมูล
- ลิงก์ OpenStreetMap
- Route GeoJSON สำหรับแสดงบน Leaflet
- ระยะทางรวมและเวลาเดินทางรวม

## Mock Data

มี mock data สำหรับจังหวัดขอนแก่น เพื่อให้ demo ได้แม้ยังไม่มี API key หรือ external API มีปัญหา

ใส่ destination เป็น:

```txt
Khon Kaen
```

หรือ:

```txt
ขอนแก่น
```

ถ้า API key ยังไม่ครบ หรือ upstream API เรียกไม่สำเร็จ แอปจะคืน itinerary mock ของขอนแก่น พร้อม markers, route GeoJSON, ระยะทางรวม และเวลาเดินทางรวม

## Troubleshooting

ตรวจการตั้งค่า server:

```txt
http://localhost:4000/api/health
```

ถ้า `missingConfig` มีค่า ให้เพิ่ม key ที่ขาดใน `.env` แล้ว restart server

ถ้า Gemini ตอบ `429` หมายความว่า API key ใช้ได้ แต่ quota หรือ rate limit เต็ม ให้รอ quota reset, เปลี่ยน key/project หรือปรับ billing/quota ใน Google AI Studio

ถ้า Gemini ตอบ `503` หมายความว่า model ที่เลือกมี demand สูงชั่วคราว แอปจะพยายาม fallback ไป `gemini-2.0-flash` อัตโนมัติเมื่อทำได้

ถ้า OpenRouteService ใช้ไม่ได้ ให้ตรวจว่า `ORS_API_KEY` ถูกต้อง active และยังมี quota เหลือ

## Notes

- ห้าม commit ไฟล์ `.env`
- ใช้ `.env.example` เป็น template สำหรับ public repo
- ควรใช้งาน OpenStreetMap/Nominatim อย่างเคารพ rate limit
- ถ้ามี production traffic จริง ควรพิจารณาใช้ geocoding provider เฉพาะทาง หรือ deploy Nominatim instance เอง
