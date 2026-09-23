/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      /**
       * 겹침 순서는 여기서만 정한다.
       * 컴포넌트에 z-[90] 같은 숫자를 직접 쓰면 서로 모르는 채로 어긋난다.
       * 실제로 모달을 Portal로 올리면서 토스트가 모달 뒤로 숨는 일이 있었다.
       *
       * 모달은 document.body로 Portal되므로 #root 바깥에서 같은 스택을 공유한다.
       * 토스트도 같은 곳으로 보내 이 숫자만으로 순서가 정해지게 한다.
       */
      zIndex: {
        header: '20',        // sticky 헤더
        sheet: '50',         // 전면 오버레이·바텀시트 (아직 Portal 미적용)
        modal: '90',         // Portal 모달
        'modal-top': '100',  // 모달 위에 겹쳐 뜨는 모달 (공유 카드)
        'modal-over': '110', // 모달 안에서 다시 전면을 덮는 폴백 화면
        toast: '120',        // 항상 최상단. 어떤 모달 위에서도 보여야 한다.
      },
    },
  },
  plugins: [],
}
