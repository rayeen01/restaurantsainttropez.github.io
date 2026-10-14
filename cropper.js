// ===== Photo Cropper — frame the photo BEFORE importing =====
// Opened automatically when a file is chosen in any image field.

function openCropper(file, options, onDone) {
    options = options || {};
    const ratios = options.ratios || ['1:1', '4:3', '16:9'];
    const maxDim = options.maxDim || 900;
    const quality = options.quality || 0.8;

    const done = (result) => {
        closeCropModal();
        try { onDone(result); } catch (e) {}
    };

    const img = new Image();
    let url = null;
    try {
        url = URL.createObjectURL(file);
    } catch (e) {
        done(null);
        return;
    }
    // NOTE: do NOT revoke the object URL here — the crop view still needs
    // it to display the photo. It is revoked when the modal closes.
    const doneFresh = (result) => {
        try { URL.revokeObjectURL(url); } catch (e) {}
        done(result);
    };
    img.onload = () => {
        buildCropper(img, url, ratios, maxDim, quality, doneFresh);
    };
    img.onerror = () => {
        if (window.showToast) showToast('Image illisible.');
        doneFresh(null);
    };
    img.src = url;
}

function closeCropModal() {
    const m = document.getElementById('crop-modal');
    if (m) m.classList.remove('active');
}

function parseRatio(r) {
    if (!r || r === 'Libre' || r === 'free') return null;
    const parts = String(r).split(':');
    if (parts.length !== 2) return null;
    const a = parseFloat(parts[0]), b = parseFloat(parts[1]);
    if (!a || !b) return null;
    return a / b;
}

function buildCropper(img, objectUrl, ratios, maxDim, quality, done) {
    const modal = document.getElementById('crop-modal');
    const body = document.getElementById('crop-modal-body');
    if (!modal || !body) {
        done(null);
        return;
    }

    const natW = img.naturalWidth || img.width;
    const natH = img.naturalHeight || img.height;
    if (!natW || !natH) {
        done(null);
        return;
    }

    body.innerHTML = `
        <div class="crop-ratios">${ratios.map((r, i) => `<button type="button" data-ratio="${r}" class="${i === 0 ? 'active' : ''}">${r}</button>`).join('')}</div>
        <div class="crop-stage" id="crop-stage">
            <img id="crop-img" alt="À cadrer" draggable="false">
            <div class="crop-box" id="crop-box"></div>
        </div>
        <label style="font-size:0.8rem;font-weight:600;">Zoom</label>
        <input type="range" id="crop-zoom" min="100" max="400" value="100">
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
            <button type="button" class="btn" id="crop-cancel">Annuler</button>
            <button type="button" class="btn btn-primary" id="crop-ok">Encadrer ✓</button>
        </div>
    `;
    modal.classList.add('active');

    const stage = document.getElementById('crop-stage');
    const view = document.getElementById('crop-img');
    const box = document.getElementById('crop-box');
    const zoom = document.getElementById('crop-zoom');
    view.src = objectUrl;

    let ratio = parseRatio(ratios[0]);
    let base = 1;
    let scale = 1;
    let left = 0;
    let top = 0;
    let boxX = 0, boxY = 0, boxW = 0, boxH = 0;

    function layout() {
        const sw = stage.clientWidth;
        const sh = stage.clientHeight;
        if (!sw || !sh) return;
        const margin = 24;
        if (ratio) {
            boxW = sw - margin * 2;
            boxH = boxW / ratio;
            if (boxH > sh - margin * 2) {
                boxH = sh - margin * 2;
                boxW = boxH * ratio;
            }
        } else {
            boxW = sw;
            boxH = sh;
        }
        boxX = (sw - boxW) / 2;
        boxY = (sh - boxH) / 2;
        box.style.left = boxX + 'px';
        box.style.top = boxY + 'px';
        box.style.width = boxW + 'px';
        box.style.height = boxH + 'px';

        base = Math.max(boxW / natW, boxH / natH);
        scale = base * (parseInt(zoom.value, 10) / 100);
        // keep image centered on the box
        const dw = natW * scale;
        const dh = natH * scale;
        left = boxX + boxW / 2 - dw / 2;
        top = boxY + boxH / 2 - dh / 2;
        draw();
    }

    function clamp() {
        const dw = natW * scale;
        const dh = natH * scale;
        left = Math.max(boxX + boxW - dw, Math.min(boxX, left));
        top = Math.max(boxY + boxH - dh, Math.min(boxY, top));
    }

    function draw() {
        clamp();
        view.style.width = (natW * scale) + 'px';
        view.style.height = (natH * scale) + 'px';
        view.style.left = left + 'px';
        view.style.top = top + 'px';
    }

    // drag to frame
    let dragging = false;
    let sx = 0, sy = 0, sl = 0, st = 0;
    stage.addEventListener('pointerdown', (e) => {
        if (e.target.closest && e.target.closest('button')) return;
        dragging = true;
        sx = e.clientX;
        sy = e.clientY;
        sl = left;
        st = top;
        try { stage.setPointerCapture(e.pointerId); } catch (err) {}
        e.preventDefault();
    });
    stage.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        left = sl + (e.clientX - sx);
        top = st + (e.clientY - sy);
        draw();
    });
    ['pointerup', 'pointercancel'].forEach(ev => stage.addEventListener(ev, () => { dragging = false; }));

    zoom.addEventListener('input', () => {
        const cx = left + (natW * scale) / 2;
        const cy = top + (natH * scale) / 2;
        scale = base * (parseInt(zoom.value, 10) / 100);
        left = cx - (natW * scale) / 2;
        top = cy - (natH * scale) / 2;
        draw();
    });

    body.querySelectorAll('.crop-ratios button').forEach(btn => {
        btn.addEventListener('click', () => {
            body.querySelectorAll('.crop-ratios button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            ratio = parseRatio(btn.dataset.ratio);
            zoom.value = '100';
            layout();
        });
    });

    document.getElementById('crop-cancel').addEventListener('click', () => done(null));
    document.getElementById('crop-modal-close').addEventListener('click', () => done(null), { once: true });
    modal.querySelector('.modal-overlay').addEventListener('click', () => done(null), { once: true });

    document.getElementById('crop-ok').addEventListener('click', () => {
        try {
            const nx = (boxX - left) / scale;
            const ny = (boxY - top) / scale;
            const nw = boxW / scale;
            const nh = boxH / scale;
            const outScale = Math.min(1, maxDim / Math.max(nw, nh));
            const outW = Math.max(1, Math.round(nw * outScale));
            const outH = Math.max(1, Math.round(nh * outScale));
            const canvas = document.createElement('canvas');
            canvas.width = outW;
            canvas.height = outH;
            canvas.getContext('2d').drawImage(img, nx, ny, nw, nh, 0, 0, outW, outH);
            done(canvas.toDataURL('image/jpeg', quality));
        } catch (e) {
            done(null);
        }
    });

    // layout now + after paint (the modal needs real dimensions)
    layout();
    requestAnimationFrame(() => requestAnimationFrame(layout));
    window.addEventListener('resize', layout, { once: true });
}

window.openCropper = openCropper;
window.closeCropModal = closeCropModal;
