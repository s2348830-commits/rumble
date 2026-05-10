// 緋色の結界 (Crimson Barrier) - チェーンビジュアル特化版

class CrimsonChain {
    constructor(skill, target) {
        this.skill = skill;
        this.target = target;
        
        // 捕縛された敵の移動を止める
        this.originalSpeed = target.speed;
        target.speed = 0; 
        target.isStunnedByCrimson = true; 
        
        this.maxLife = skill.baseLife;
        this.life = this.maxLife;
        this.progress = 0;
        this.extendSpeed = skill.extendSpeed;
        
        this.damageTimer = 0;
        // 鎖のリングの向きをランダムに少しずらすためのシード
        this.seed = Math.random() * 10;
    }

    update() {
        if (this.progress < 1) {
            this.progress += this.extendSpeed;
        } else {
            this.life--;

            // Lv4 源血の祭典：周囲の敵に鈍足効果を付与
            if (this.skill.level >= 4 && this.skill.evo4 === "blood_festival") {
                enemies.forEach(e => {
                    if (e !== this.target && !e.isStunnedByCrimson) {
                        const dist = Math.hypot(e.x - this.target.x, e.y - this.target.y);
                        if (dist < 100) {
                            if (!e.isSlowedByCrimson) {
                                e.originalSpeed = e.speed;
                                e.speed *= 0.5;
                                e.isSlowedByCrimson = true;
                            }
                        }
                    }
                });
            }

            // Lv5以降: 継続ダメージ
            if (this.skill.level >= 5) {
                this.damageTimer++;
                if (this.damageTimer >= 60) {
                    this.target.hp -= 10;
                    this.damageTimer = 0;
                }
            }
        }

        // ターゲットが消失したら解除
        if (!this.target || (typeof enemies !== 'undefined' && !enemies.includes(this.target))) {
            this.life = 0;
        }

        // 寿命が尽きたら敵を撃破
        if (this.life <= 0) {
            if (this.target && this.target.hp > 0) {
                this.skill.killEnemy(this.target);
            }
        }
    }

    draw(ctx) {
        if (!this.target || this.life <= 0) return;

        const dx = this.target.x - player.x;
        const dy = this.target.y - player.y;
        const totalDist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        
        // 現在の鎖の伸びている距離
        const currentDist = totalDist * this.progress;

        ctx.save();

        // 鎖の「環（リンク）」を描画する設定
        const linkLength = 14; // 一つの環の長さ
        const linkWidth = 8;   // 一つの環の幅
        const numLinks = Math.floor(currentDist / (linkLength * 0.7));

        for (let i = 0; i <= numLinks; i++) {
            const t = i / (numLinks || 1);
            const lx = player.x + Math.cos(angle) * (i * linkLength * 0.7);
            const ly = player.y + Math.sin(angle) * (i * linkLength * 0.7);

            ctx.save();
            ctx.translate(lx, ly);
            ctx.rotate(angle);
            
            // 環を交互に傾けて立体感を出す
            if (i % 2 === 0) {
                ctx.scale(1, 0.4);
            } else {
                ctx.scale(1, 0.8);
            }

            // 環の描画
            ctx.beginPath();
            ctx.ellipse(0, 0, linkLength / 2, linkWidth / 2, 0, 0, Math.PI * 2);
            
            // 色の設定（oldベースの深紅）
            ctx.strokeStyle = "rgba(180, 0, 0, 0.9)";
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 環の内側にうっすら光を入れる
            ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
            ctx.fill();
            
            ctx.restore();
        }

        // 捕縛対象の強調（シンプルな赤いサークル）
        if (this.progress >= 0.9) {
            ctx.beginPath();
            ctx.arc(this.target.x, this.target.y, this.target.radius + 6, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 0, 0, 0.6)";
            ctx.setLineDash([4, 2]); // 点線にして「縛られている感」を出す
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();
    }
}

class CrimsonBarrierSkill {
    constructor() {
        this.level = 1;
        this.evo4 = null;
        this.evo7 = null;
        
        this.maxChains = 1;
        this.maxReach = 350;
        this.baseLife = 120;
        this.extendSpeed = 0.15;
        
        this.activeChains = [];
    }

    updateStats() {
        this.maxChains = this.level;
        this.maxReach = 350 + (this.level * 20);
        this.baseLife = 120 + (this.level * 10);
        this.extendSpeed = 0.15 + (this.level * 0.01);

        if (this.level >= 4) {
            if (this.evo4 === "blood_erosion") {
                this.maxChains = this.level + 2; 
                this.maxReach += 50;
            } else if (this.evo4 === "blood_festival") {
                this.maxChains = Math.max(3, this.level - 1);
            }
        }

        if (this.level >= 7) {
            if (this.evo7 === "blood_pact") {
                this.maxReach = 9999; 
                this.maxChains += 2;
            } else if (this.evo7 === "crimson_offense") {
                this.maxReach = 600;
                this.maxChains += 4;
            }
        }
    }

    levelUp() {
        this.level++;
        this.updateStats();
    }

    killEnemy(e) {
        e.hp = 0;
        if (typeof e.onDeath === 'function') e.onDeath();
        const idx = enemies.indexOf(e);
        if (idx > -1) {
            if (typeof ExpGem !== 'undefined') expGems.push(new ExpGem(e.x, e.y, 5));
            enemies.splice(idx, 1);
        }
    }

    update() {
        this.activeChains = this.activeChains.filter(c => c.life > 0);
        this.activeChains.forEach(c => c.update());

        // 鈍足解除処理
        if (this.level >= 4 && this.evo4 === "blood_festival") {
            enemies.forEach(e => {
                if (e.isSlowedByCrimson && !e.isStunnedByCrimson) {
                    let isNearChain = this.activeChains.some(c => c.target && Math.hypot(e.x - c.target.x, e.y - c.target.y) < 100);
                    if (!isNearChain) {
                        e.speed = e.originalSpeed || e.speed;
                        e.isSlowedByCrimson = false;
                    }
                }
            });
        }

        // 索敵と捕縛
        if (this.activeChains.length < this.maxChains && enemies.length > 0) {
            let candidates = enemies.filter(e => !e.isStunnedByCrimson);
            candidates.sort((a, b) => {
                const distA = Math.hypot(a.x - player.x, a.y - player.y);
                const distB = Math.hypot(b.x - player.x, b.y - player.y);
                return distA - distB;
            });

            for (let e of candidates) {
                if (this.activeChains.length >= this.maxChains) break;
                const dist = Math.hypot(e.x - player.x, e.y - player.y);
                if (dist < this.maxReach) {
                    this.activeChains.push(new CrimsonChain(this, e));
                }
            }
        }
    }

    draw(ctx) {
        // 鎖の描画
        this.activeChains.forEach(c => c.draw(ctx));

        // 究極進化時の足元の演出
        if (this.level >= 7 && this.evo7 === "blood_pact") {
            ctx.save();
            ctx.strokeStyle = "rgba(150, 0, 0, 0.4)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(player.x, player.y, 50, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }
}