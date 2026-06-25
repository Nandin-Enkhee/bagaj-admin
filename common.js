// ====== AUTH GUARD ======
// Бүх protected хуудас дээр энэ ажиллана: нэвтрээгүй бол login руу шилжинэ
//
// iOS Safari зэрэг зарим browser дээр Firebase Auth-ийн session сэргэхэд
// бага зэрэг хугацаа авдаг тул onAuthStateChanged эхэндээ "user=null" гэж
// нэг удаа дуудагдчихдаг (хараахан session ачаалаагүй учраас), дараа нь
// удалгүй жинхэнэ user-тэйгээр дахин дуудагдана. Хэрвээ бид эхний null
// дээр шууд redirect хийвэл хуудас "анивчиж" алга болдог. Тиймээс
// auth.currentUser-ийг шууд шалгаж, хэрвээ байгаа бол түр хүлээж үзнэ.
let authCheckTimeout = null;

function requireAuth(callback) {
  let resolved = false;

  auth.onAuthStateChanged(user => {
    resolved = true;
    if (authCheckTimeout) clearTimeout(authCheckTimeout);

    if (!user) {
      window.location.href = "index.html";
    } else {
      callback(user);
    }
  });

  // Хамгаалалт: хэрвээ ямар нэг шалтгаанаар onAuthStateChanged 3 секундын
  // дотор дуудагдахгүй бол (сүлжээний асуудал гэх мэт), redirect хийхгүй,
  // зүгээр алдааны мэдэгдэл үзүүлнэ — хэрэглэгчийг login руу алдаатай
  // шилжүүлэхгүйн тулд.
  authCheckTimeout = setTimeout(() => {
    if (!resolved) {
      console.warn("Auth шалгалт хариу өгөхгүй байна. Сүлжээгээ шалгаарай.");
    }
  }, 3000);
}

function doLogout() {
  auth.signOut().then(() => {
    window.location.href = "index.html";
  });
}

// ====== SIDEBAR RENDER ======
function renderSidebar(activePage) {
  const items = [
    { id: "dashboard", emoji: "🏠", label: "Нүүр", href: "dashboard.html" },
    { id: "tools", emoji: "🛠️", label: "Багаж", href: "tools.html" },
    { id: "categories", emoji: "📦", label: "Хайрцаг", href: "categories.html" },
    { id: "history", emoji: "📋", label: "Түүх", href: "history.html" },
  ];

  const navHtml = items.map(item => `
    <a href="${item.href}" style="text-decoration:none;">
      <div class="nav-item ${item.id === activePage ? 'active' : ''}">
        <span class="emoji">${item.emoji}</span>
        <span>${item.label}</span>
      </div>
    </a>
  `).join("");

  return `
    <div class="sidebar">
      <div class="brand">
        <div class="icon">🛠️</div>
        <span>Багаж Удирдлага</span>
      </div>
      ${navHtml}
      <div class="spacer"></div>
      <div class="logout" onclick="doLogout()">
        <span class="emoji">🚪</span>
        <span class="logout-label">Гарах</span>
      </div>
    </div>
  `;
}

// ====== TOAST ======
function showToast(message, type = "success") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  const icon = type === "success" ? "✅" : "⚠️";
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

// ====== ЗУРАГ ТОМРУУЛАХ POPUP ======
// Бүх хуудас дээр ашиглагдах: img дээр onclick="openImageViewer(this.src)" гэж залгана
function openImageViewer(src) {
  if (!src) return;
  let viewer = document.getElementById("imageViewerOverlay");
  if (!viewer) {
    viewer = document.createElement("div");
    viewer.id = "imageViewerOverlay";
    viewer.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.85);
      display: none; align-items: center; justify-content: center;
      z-index: 5000; padding: 20px; cursor: zoom-out;
    `;
    viewer.innerHTML = `<img id="imageViewerImg" style="max-width:90vw; max-height:90vh; border-radius:10px; box-shadow:0 20px 60px rgba(0,0,0,0.5);">`;
    viewer.onclick = () => { viewer.style.display = "none"; };
    document.body.appendChild(viewer);
  }
  document.getElementById("imageViewerImg").src = src;
  viewer.style.display = "flex";
}
function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(timestamp) {
  if (!timestamp) return "—";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString("mn-MN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  });
}

function dateOnlyString(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Зургийг compress хийж base64/blob болгох (tablet камераас ирсэн зураг ихэвчлэн том байдаг)
function compressImage(file, maxWidth = 800, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => resolve(blob),
          "image/jpeg",
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
