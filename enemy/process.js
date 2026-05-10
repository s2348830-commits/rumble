// 敵キャラクターのクラス定義と処理

const enemyImages = [];
for (let i = 1; i <= 4; i++) {
    const img = new Image();
    img.src = `image/enemy/${i}.png`;
    enemyImages.push(img);
}

// 特殊敵の生成物用配列
let poisonFields = [];
let enemyProjectiles = [];

class PoisonField {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 60;
        this.life = 300; // 5秒間残留
    }
    update() {
        this.life--;
        if (Math.hypot(player.x - this.x, player.y - this.y) < this.radius + 10) {
            if (typeof damagePlayer === 'function') damagePlayer(2); // プレイヤーに持続ダメージ
        }
    }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.fillStyle = `rgba(138, 43, 226, ${this.life / 300 * 0.6})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class EnemyProjectile {
    constructor(x, y, tx, ty) {
        this.x = x;
        this.y = y;
        const angle = Math.atan2(ty - y, tx - x);
        this.vx = Math.cos(angle) * 3;
        this.vy = Math.sin(angle) * 3;
        this.radius = 6;
        this.life = 180;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        if (Math.hypot(player.x - this.x, player.y - this.y) < this.radius + 15) {
            if (typeof damagePlayer === 'function') damagePlayer(10);
            this.life = 0;
        }
    }
    draw(ctx) {
        if (this.life <= 0) return;
        
        // ★負荷対策：shadowBlurをやめて半透明の円でグロー効果を出す
        ctx.fillStyle = '#ff00ff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255, 0, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 12;
        this.speed = Math.random() * 0.5 + 0.5;
        this.originalSpeed = this.speed;
        this.color = '#ff3333';
        
        // 画像をランダムに割り当て
        this.image = enemyImages[Math.floor(Math.random() * enemyImages.length)];
        
        // ベースのHP
        this.baseHp = 15;
        
        // --- HPの増加処理：10秒ごとに15ずつ加算 ---
        let gt = typeof gameTime !== 'undefined' ? gameTime : 0;
        // 計算式: 初期HP(10) + (経過時間 / 10) × 15
        this.maxHp = this.baseHp + Math.floor(gt / 10) * 15;
        this.hp = this.maxHp;

        // 特殊能力フラグ
        this.isToxic = false;
        this.isRanged = false;
        this.attackTimer = 0;

        // 15分(900秒)以上で10%の確率で死亡時に毒を撒く敵になる
        if (gt > 900 && Math.random() < 0.1) {
            this.isToxic = true;
        }

        // 30分(1800秒)以上で少数(5%)が遠距離攻撃をしてくるようになる
        if (gt > 1800 && Math.random() < 0.05) {
            this.isRanged = true;
            this.speed *= 0.6; // 遠距離は足が遅い
        }
    }
    
    update(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist > 0 && this.speed > 0) {
            if (this.isRanged && dist < 250) {
                // 遠距離敵は一定距離まで近づいたら止まって攻撃する
                this.attackTimer++;
                if (this.attackTimer > 120) {
                    this.attackTimer = 0;
                    enemyProjectiles.push(new EnemyProjectile(this.x, this.y, px, py));
                }
            } else {
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
            }
        }
    }
    
    draw(ctx) {
        if (this.image && this.image.complete) {
            ctx.save();
            ctx.translate(this.x, this.y);
            
            // 進行方向に向ける場合
            if (typeof player !== 'undefined') {
                if (player.x < this.x) {
                    ctx.scale(-1, 1);
                }
            }
            
            // ★負荷対策：shadowBlurを廃止し、半透明の円でオーラを表現
            if (this.isToxic) {
                ctx.beginPath();
                ctx.arc(0, 0, this.radius * 2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(138, 43, 226, 0.4)';
                ctx.fill();
            }
            if (this.isRanged) {
                ctx.beginPath();
                ctx.arc(0, 0, this.radius * 2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 0, 255, 0.4)';
                ctx.fill();
            }

            ctx.drawImage(this.image, -this.radius * 1.5, -this.radius * 1.5, this.radius * 3, this.radius * 3);
            ctx.restore();
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.closePath();
        }
    }

    // 死亡時の処理
    onDeath() {
        if (this.isToxic) {
            poisonFields.push(new PoisonField(this.x, this.y));
        }
    }
}