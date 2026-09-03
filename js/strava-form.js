function initChallengeFormEnhancements() {
  const fileInput = document.getElementById("evidenceInput");
  const picker = document.getElementById("evidencePicker");
  const fileName = document.getElementById("evidenceFileName");
  const modal = document.getElementById("challengeModal");

  if (!fileInput || !picker || !fileName) return;

  const updateFileName = () => {
    const file = fileInput.files?.[0];
    fileName.textContent = file ? file.name : "Belum ada file dipilih";
    picker.classList.toggle("has-file", Boolean(file));
  };

  fileInput.addEventListener("change", updateFileName);

  // The main app already resets the native input. Keep the custom UI in sync.
  if (modal) {
    const observer = new MutationObserver(() => {
      if (modal.hidden) {
        fileName.textContent = "Belum ada file dipilih";
        picker.classList.remove("has-file");
      }
    });
    observer.observe(modal, { attributes: true, attributeFilter: ["hidden"] });
  }

  updateFileName();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initChallengeFormEnhancements);
} else {
  initChallengeFormEnhancements();
}
