# 오사카 맛집 지도

난바·우메다와 인접 지역의 식당을 지역, 장르, 예산, 선정 이력으로 탐색하는 정적 웹페이지입니다. `index.html`을 열면 사용할 수 있으며 빌드나 API 키가 필요 없습니다.

- `restaurants.js`에 식당별 원문 링크와 점심·저녁 1인 예산, 타베로그 평점 및 선정 이력을 정리했습니다. 데이터 확인일은 2026년 11월 19일입니다.
- 예산은 타베로그 리뷰 평균을 우선합니다. 기본 예산은 저녁을 먼저 사용하고, 저녁 예산이 없으면 점심을 사용합니다. 기준인 1만 엔이 범위에 포함되면 두 예산 필터에 모두 표시됩니다.
- ‘추천’은 타베로그 어워드 수상점에 표시합니다. 백명점과 미쉐린 선정 이력은 각 배지로 표시합니다.
- 도톤보리 사진은 [Sakai Yayoi의 Wikimedia Commons 원본](https://commons.wikimedia.org/wiki/File:Osaka_Dotonbori_yoru.jpg)을 잘라 WebP로 변환했습니다. [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
