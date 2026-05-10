// キャラクターや入力のクラス・オブジェクトを定義

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 12;
        this.speed = 3.5;
        this.color = '#00aaff';
    }
    update(vx, vy, width, height) {
        this.x += vx * this.speed;
        this.y += vy * this.speed;
        
        // 画面外に出ないように制限
        this.x = Math.max(this.radius, Math.min(width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(height - this.radius, this.y));
    }
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
    }
}

class ExpGem {
    constructor(x, y, amount) {
        this.x = x;
        this.y = y;
        this.radius = 4;
        this.color = '#00ff44';
        this.amount = amount;
    }
    draw(ctx) {
        ctx.beginPath();
        ctx.rect(this.x - this.radius, this.y - this.radius, this.radius*2, this.radius*2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }
}

// バーチャルスティック入力管理
const Input = {
    vx: 0,
    vy: 0,
    active: false,
    baseX: 0,
    baseY: 0,
    maxRadius: 50, // スティックが動く最大半径
    
    init() {
        this.zone = document.getElementById('joystick-zone');
        this.base = document.getElementById('joystick-base');
        this.knob = document.getElementById('joystick-knob');
        
        // タッチイベント（スマホ用）
        this.zone.addEventListener('touchstart', this.handleStart.bind(this), {passive: false});
        this.zone.addEventListener('touchmove', this.handleMove.bind(this), {passive: false});
        this.zone.addEventListener('touchend', this.handleEnd.bind(this));
        this.zone.addEventListener('touchcancel', this.handleEnd.bind(this));
        
        // マウスイベント（PC確認用）
        this.zone.addEventListener('mousedown', this.handleStart.bind(this));
        window.addEventListener('mousemove', this.handleMove.bind(this));
        window.addEventListener('mouseup', this.handleEnd.bind(this));

        // タブ切り替え・バックグラウンド移行時に入力をリセット
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) this.reset();
        });
        window.addEventListener("blur", () => {
            this.reset();
        });
    },
    
    handleStart(e) {
        // スキル選択中などポーズ時は入力を受け付けない
        if (typeof isPaused !== 'undefined' && isPaused) return;
        
        e.preventDefault();
        this.active = true;
        
        const touch = e.type.includes('mouse') ? e : e.changedTouches[0];
        this.baseX = touch.clientX;
        this.baseY = touch.clientY;
        
        // スティックのベースをタッチ位置に移動して表示
        this.base.style.left = this.baseX + 'px';
        this.base.style.top = this.baseY + 'px';
        this.base.classList.remove('hidden');
        this.knob.style.transform = `translate(-50%, -50%)`;
        
        this.vx = 0;
        this.vy = 0;
    },
    
    handleMove(e) {
        if (!this.active) return;
        e.preventDefault();
        
        const touch = e.type.includes('mouse') ? e : e.changedTouches[0];
        const dx = touch.clientX - this.baseX;
        const dy = touch.clientY - this.baseY;
        const distance = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        
        // ノブがベースから外に出ないように制限
        const limitedDist = Math.min(distance, this.maxRadius);
        
        // ノブの視覚的な移動
        const knobX = Math.cos(angle) * limitedDist;
        const knobY = Math.sin(angle) * limitedDist;
        this.knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
        
        // プレイヤーの移動速度入力（-1.0 〜 1.0）
        this.vx = (Math.cos(angle) * limitedDist) / this.maxRadius;
        this.vy = (Math.sin(angle) * limitedDist) / this.maxRadius;
    },
    
    handleEnd(e) {
        this.reset();
    },
    
    reset() {
        this.active = false;
        this.vx = 0;
        this.vy = 0;
        if (this.base) {
            this.base.classList.add('hidden');
        }
    }
};