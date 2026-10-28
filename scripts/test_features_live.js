const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
ws.onopen = () => {
  const code = `
    (() => {
      const report = {};
      
      // 1. 測試創角紙娃娃系統
      window.AvatarManager.openCreatorModal();
      const modal = document.getElementById("avatarModal");
      report.avatarModalOpen = modal && modal.classList.contains("active");
      
      // 模擬自訂髮色與職業
      window.AvatarManager.currentAvatar.hairColor = "#f1c40f"; // 金髮
      window.AvatarManager.currentAvatar.outfitClass = "scholar"; // 學者
      window.AvatarManager.saveToStorage();
      window.AvatarManager.closeCreatorModal();
      report.avatarCustomized = window.AvatarManager.currentAvatar.hairColor === "#f1c40f" && window.AvatarManager.currentAvatar.outfitClass === "scholar";

      // 2. 測試手寫板
      window.HandwritingBoard.openModal("あ");
      const hwModal = document.getElementById("handwritingModal");
      report.hwModalOpen = hwModal && hwModal.classList.contains("active");
      // 模擬筆劃繪製
      window.HandwritingBoard.strokes = [
        [{ x: 100, y: 80 }, { x: 180, y: 80 }],
        [{ x: 140, y: 60 }, { x: 140, y: 220 }]
      ];
      const hwEval = window.HandwritingBoard.evaluateWriting();
      report.hwScore = hwEval.score;
      hwModal.classList.remove("active");

      // 3. 測試發音評分
      let speechEvaluated = false;
      window.SpeechEvaluator.startRecord("あした", "あした", (res) => {
        speechEvaluated = true;
      });
      window.SpeechEvaluator.evaluate("あした", 0.95);
      const speechModal = document.getElementById("speechResultModal");
      report.speechModalOpen = speechModal && speechModal.classList.contains("active");
      if (speechModal) speechModal.classList.remove("active");

      // 4. 測試公會委託信閱讀
      window.ListeningReadingModule.openQuestLetterModal(1);
      const letterModal = document.getElementById("questLetterModal");
      report.letterModalOpen = letterModal && letterModal.classList.contains("active");
      if (letterModal) letterModal.classList.remove("active");

      // 5. 測試冒險圖鑑與魔物生態
      window.App.switchTab("tab-compendium");
      window.App.renderCompendium("monsters");
      const monsterCards = document.querySelectorAll("#cardsDeckGrid .compendium-card");
      report.compendiumMonstersRendered = monsterCards.length;
      
      const statsBar = document.getElementById("cStatMonsters");
      report.compendiumStatsText = statsBar ? statsBar.textContent : null;

      return report;
    })()
  `;
  ws.send(JSON.stringify({
    id: 40,
    method: 'Runtime.evaluate',
    params: { expression: code, returnByValue: true }
  }));
};

ws.onmessage = (msg) => {
  console.log('FEATURES_TEST_REPORT:', msg.data);
  process.exit(0);
};
