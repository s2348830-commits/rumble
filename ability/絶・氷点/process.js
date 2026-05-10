// 絶・氷点 (Absolute Zero) の演出・ロジック

function drawHexCrystal(ctx, x, y, size, rot, alpha, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    
    // モデルを参考にした外側の発光層
    ctx.shadowBlur = 30 * alpha;
    ctx.shadowColor = "#00f2ff";
    ctx.fillStyle = "rgba(160, 255, 255, 0.3)";
    
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        let angle = i * Math.PI / 3;
        let r = i % 2 === 0 ? size : size * 0.45;
        ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fill();
    
    // 内側のメイン結晶
    ctx.fillStyle = color; // モデルでは白や淡い青
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        let angle = i * Math.PI / 3;
        let r = i % 2 === 0 ? size * 0.7 : size * 0.25;
        ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fill();

    // 輪郭線
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // 内部の装飾ライン（モデルの幾何学模様）
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        let angle = i * Math.PI / 3;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * size * 0.7, Math.sin(angle) * size * 0.7);
    }
    ctx.stroke();
    
    ctx.restore();
}

class ShatteredHex {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const spd = Math.random() * 15 + 5;
        this.vx = Math.cos(angle) * spd;
        this.vy = Math.sin(angle) * spd;
        this.size = size * (Math.random() * 0.5 + 0.3);
        this.life = 60;
        this.rot = Math.random() * Math.PI;
        this.rotSpeed = (Math.random() - 0.5) * 0.3;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2; // わずかに重力で落下
        this.rot += this.rotSpeed;
        this.life--;
    }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.globalAlpha = this.life / 60;
        ctx.fillStyle = "#e0faff";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#00f2ff";
        
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(this.size/2, 0);
        ctx.lineTo(0, this.size);
        ctx.lineTo(-this.size/2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

class AbsoluteZeroSkill {
    constructor() {
        this.level = 7;
        this.cooldown = 180 * 60; // 3分 (180秒)
        this.currentCooldown = 0; 
        this.freezeDuration = 180; // 3秒間停止
        this.active = false;
        this.freezeTimer = 0;
        
        this.shattered = [];
        this.rot = 0;
        
        // 既存のボタンがあれば削除（リスタート時の重複防止）
        const oldBtn = document.getElementById('absolute-zero-btn');
        if (oldBtn) oldBtn.remove();

        // 画面左上に発動用のボタンを生成（絶・氷点モデル.htmlのスタイルを適用）
        this.button = document.createElement('button');
        this.button.id = 'absolute-zero-btn';
        this.button.innerHTML = '<span style="font-size:10px; opacity:0.8;">ULTIMATE</span><br>絶・氷点';
        
        // CSSスタイリング（モデルのボタンを再現）
        Object.assign(this.button.style, {
            position: 'absolute',
            top: '80px',
            left: '10px',
            zIndex: '10000',
            width: '120px',
            height: '60px',
            background: 'linear-gradient(135deg, rgba(0, 20, 60, 0.9), rgba(0, 100, 200, 0.8))',
            color: '#fff',
            border: '1px solid #00f2ff',
            fontWeight: 'bold',
            cursor: 'pointer',
            pointerEvents: 'auto',
            clipPath: 'polygon(10% 0, 100% 0, 90% 100%, 0 100%)', // 特徴的な多角形
            boxShadow: '0 0 20px rgba(0, 242, 255, 0.5)',
            textShadow: '0 0 10px #00f2ff',
            fontFamily: 'serif',
            transition: '0.3s'
        });
        
        document.getElementById('ui-layer').appendChild(this.button);
        
        this.button.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            this.activateSkill();
        });
    }
    
    activateSkill() {
        if (this.currentCooldown <= 0 && !this.active) {
            this.active = true;
            this.freezeTimer = this.freezeDuration;
            this.currentCooldown = this.cooldown;
            
            // モデル同様のセピア＋高コントラストフィルタ
            canvas.style.filter = 'sepia(0.5) contrast(1.4) brightness(1.1) hue-rotate(-15deg)';
            
            // 画面揺らし（CSSクラスがない場合を考慮し直接適用）
            document.getElementById('gameCanvas').style.animation = 'none';
            setTimeout(() => {
                document.getElementById('gameCanvas').style.animation = 'shake 0.5s screen';
            }, 10);
        }
    }
    
    killEnemy(enemy) {
        const index = enemies.indexOf(enemy);
        if (index > -1) {
            expGems.push(new ExpGem(enemy.x, enemy.y, 10)); // レアスキルなので多めに設定
            enemies.splice(index, 1);
        }
    }
    
    update() {
        // クールダウンとボタン表示
        if (this.currentCooldown > 0) {
            this.currentCooldown--;
            let sec = Math.ceil(this.currentCooldown / 60);
            this.button.innerHTML = `<span style="font-size:10px; opacity:0.5;">RECHARGING</span><br>${sec}s`;
            this.button.style.opacity = '0.6';
            this.button.style.filter = 'grayscale(1)';
            this.button.style.boxShadow = 'none';
        } else {
            this.button.innerHTML = '<span style="font-size:10px; color:#00f2ff;">READY</span><br>絶・氷点';
            this.button.style.opacity = '1';
            this.button.style.filter = 'none';
            this.button.style.boxShadow = `0 0 ${20 + Math.sin(Date.now()*0.01)*10}px rgba(0, 242, 255, 0.7)`; // 脈動
        }
        
        if (this.active) {
            this.freezeTimer--;
            this.rot += 0.02;
            
            enemies.forEach(e => {
                if (!e.isFrozenByAbsolute) {
                    e.isFrozenByAbsolute = true;
                    e.originalSpeed = e.speed;
                    e.speed = 0;
                } else {
                    e.speed = 0; 
                }
            });

            if (this.freezeTimer <= 0) {
                this.active = false;
                canvas.style.filter = 'none';
                
                enemies.forEach(e => {
                    if (e.isFrozenByAbsolute) {
                        e.speed = e.originalSpeed || e.speed;
                        e.isFrozenByAbsolute = false;
                        this.killEnemy(e);
                    }
                });
                
                // 画面中央から大量の破片
                for(let i=0; i<60; i++) {
                    this.shattered.push(new ShatteredHex(player.x, player.y, Math.random() * 40 + 20));
                }
            }
        }

        for (let i = this.shattered.length - 1; i >= 0; i--) {
            this.shattered[i].update();
            if (this.shattered[i].life <= 0) this.shattered.splice(i, 1);
        }
    }
    
    draw(ctx) {
        if (this.active) {
            // 背景のオーラ
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = `rgba(180, 240, 255, 0.2)`;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
            
            // プレイヤー位置に巨大な究極結晶を描画
            let alpha = Math.min(1.0, this.freezeTimer / 30); // 消え際だけでなく出現時も滑らかに
            drawHexCrystal(ctx, player.x, player.y, Math.max(width, height) * 0.45, this.rot, alpha, "rgba(255, 255, 255, 0.9)");
        }
        this.shattered.forEach(s => s.draw(ctx));
    }
}