# 데이유즈 코인 · 3D 에셋

## 파일
- `dayuse-coin.glb` — 실제 3D 모델(glTF 2.0 바이너리, 약 2만 삼각형, 900KB). three.js · Unity · Blender · Spline · iOS/Android 3D 뷰어에서 바로 열려요.
- `renders/` — 투명 배경 PNG 900×900: 앞면, 뒷면, 비스듬히, 옆면
- `spin/` — 세로축 360° 회전 36프레임(10° 간격), 투명 PNG 900×900. 3D 엔진 없이 스프라이트 애니메이션으로 쓸 때.
- `viewer/coin.html` — 회전·튕기기·뒤집기 데모. 모델이 파일 안에 들어 있어서 더블클릭으로 바로 열려요(인터넷 연결만 필요: three.js를 CDN에서 불러옴).

## 모델 규격
- 단위: 지름 1.0(반지름 0.5), 두께 약 0.11 (테두리 포함). 실제 500원 동전 비율(지름 26.5mm, 두께 약 1.9mm)보다 약간 두껍게 해서 화면에서 옆면이 잘 보이게 했어요.
- 원점: 코인 중심. **앞면이 +Z, 뒷면이 −Z** 방향. 위쪽이 +Y.
- 바닥에 눕힐 때(앞면이 위): X축으로 −90°. 뒷면이 위: X축 +90° 후 Z축 180°(글자가 바로 보이게).

## 구조 (노드 이름)
| 노드 | 내용 | 재질 |
|---|---|---|
| edge | 톱니(160개) 옆면 + 코어 | gold_edge (금속, 거칠기 0.42) |
| rim_front / rim_back | 볼록한 테두리 | gold_polished (금속, 거칠기 0.30) |
| field_front / field_back | 안쪽 바탕 면 · **테마 색 슬롯** | field_theme (금속, 매트, 거칠기 0.62) |
| bead_front / bead_back | 안쪽 가는 링 | gold |
| relief_front_dayu | 앞면 데이유 양각 (눈·입은 바탕이 비쳐 보임) | gold (광택 금속, 거칠기 0.18) |
| relief_back_DAYUSE | 뒷면 "DAYUSE" 양각 + 점 6개 | gold |

## 렌더 팁
- 금속은 환경맵이 있어야 금색으로 보여요. three.js는 `RoomEnvironment` + `PMREMGenerator`, 톤매핑 ACES, 출력 sRGB.
- 그림자는 바닥에 ShadowMaterial(불투명도 0.18) 정도면 충분해요.
- 기본은 금색 단색이에요. 바탕은 무광, 양각(데이유·DAYUSE·테두리)은 유광이라 같은 금색이어도 로고가 읽혀요.
- **테마 색 입히기:** `field_theme` 재질 하나만 바꾸면 돼요. 예) 파란 에나멜 = 색 #2563EB, metalness 0, roughness 0.42.
  - three.js: `mesh.material.name === 'field_theme'`인 메시의 color/metalness/roughness 변경
  - 데모 뷰어에서는 콘솔에 `__setFieldColor('#2563EB', {metal:0, rough:0.42})`로 바로 확인할 수 있어요.
