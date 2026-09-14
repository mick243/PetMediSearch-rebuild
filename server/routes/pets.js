const express = require('express');
const {
    getMyPets, addPet, updatePet, deletePet,
    addVaccination,
  updateVaccination, setVaccinationDone, deleteVaccination,
} = require('../controller/pets');
const router = express.Router();

/**
 * @swagger
 * /pets:
 *   get:
 *     tags: [Pets]
 *     summary: 내 반려동물 목록 (접종 일정 포함)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 반려동물 배열
 *       401:
 *         description: 유효하지 않은 토큰입니다.
 *   post:
 *     tags: [Pets]
 *     summary: 반려동물 등록
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: '짱구' }
 *               category_id: { type: integer, example: 2 }
 *               breed: { type: string, example: '말티즈' }
 *               birth_date: { type: string, example: '2023-05-01' }
 *               weight_kg: { type: number, example: 4.2 }
 *     responses:
 *       200:
 *         description: 등록 완료
 */
router.get('/', getMyPets);
router.post('/', addPet);

/**
 * @swagger
 * /pets/{pet_id}:
 *   put:
 *     tags: [Pets]
 *     summary: 반려동물 수정
 *     security:
 *       - BearerAuth: []
 *   delete:
 *     tags: [Pets]
 *     summary: 반려동물 삭제
 *     security:
 *       - BearerAuth: []
 */
router.put('/:pet_id', updatePet);
router.delete('/:pet_id', deletePet);

/**
 * @swagger
 * /pets/{pet_id}/vaccinations:
 *   post:
 *     tags: [Pets]
 *     summary: 접종·검진 일정 추가
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: '종합백신 5차' }
 *               due_date: { type: string, example: '2026-09-22' }
 *               due_time: { type: string, example: '15:30', description: '선택. 모르면 비웁니다' }
 */
router.post('/:pet_id/vaccinations', addVaccination);

/**
 * @swagger
 * /pets/vaccinations/{vaccination_id}:
 *   put:
 *     tags: [Pets]
 *     summary: 접종·검진 일정 수정 (이름·날짜·시각)
 *     description: >
 *       done 은 바꾸지 않습니다. 완료 체크는 PATCH 로 따로 다룹니다 —
 *       수정 화면이 그 값을 덮어쓰면 사용자가 모르는 사이에 완료가 풀립니다.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: '종합백신 5차' }
 *               due_date: { type: string, example: '2026-09-22' }
 *               due_time: { type: string, example: '15:30', description: '선택. 모르면 비웁니다' }
 *   patch:
 *     tags: [Pets]
 *     summary: 접종 완료 여부 변경
 *     security:
 *       - BearerAuth: []
 *   delete:
 *     tags: [Pets]
 *     summary: 접종 일정 삭제
 *     security:
 *       - BearerAuth: []
 */
router.put('/vaccinations/:vaccination_id', updateVaccination);
router.patch('/vaccinations/:vaccination_id', setVaccinationDone);
router.delete('/vaccinations/:vaccination_id', deleteVaccination);

module.exports = router;
