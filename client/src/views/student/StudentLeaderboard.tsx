'use client';

import React, { useState } from 'react';
import { useStudentPortal } from '../../hooks/useStudentPortal';
import {
  Trophy,
  Flame,
  Zap,
  Coins,
  Crown,
  Medal,
  Award,
  Sparkles,
  ShoppingBag,
  ArrowUp,
  CheckCircle2,
  Gift,
} from 'lucide-react';
import styles from './StudentLeaderboard.module.css';

export const StudentLeaderboard: React.FC = () => {
  const { leaderboard, currentUserRank, group } = useStudentPortal();

  const [activeTab, setActiveTab] = useState<'LEADERBOARD' | 'SHOP'>('LEADERBOARD');
  const [redeemedNotice, setRedeemedNotice] = useState<string | null>(null);

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];

  const currentCoins = currentUserRank?.coins || 42;
  const currentXp = currentUserRank?.xp || 850;

  const shopItems = [
    {
      id: 'shop-1',
      title: 'IT Park Developer Stikerlar to\'plami',
      desc: 'Noutbuk va telefon uchun maxsus dasturchilar stikerlari.',
      price: 25,
      icon: '🎨',
    },
    {
      id: 'shop-2',
      title: 'IT Park Brendli Futbolka',
      desc: 'Yuqori sifatli qora yoki oq rangli paxta futbolka.',
      price: 80,
      icon: '👕',
    },
    {
      id: 'shop-3',
      title: 'Ustoz bilan 1-on-1 Mentorlik (1 soat)',
      desc: 'Shaxsiy portfolio va rezyume tahlili bo\'yicha yakkama-yakka suhbat.',
      price: 120,
      icon: '🚀',
    },
    {
      id: 'shop-4',
      title: 'IT Park Termos / Suv idishi',
      desc: 'Darslar va ofis uchun zamonaviy metall termos.',
      price: 60,
      icon: '☕',
    },
  ];

  const handleRedeem = (item: any) => {
    if (currentCoins < item.price) {
      alert("IT-Coins yetarli emas! Darslarga faol qatnashib va vazifalarni topshirib ko'proq coins to'plang.");
      return;
    }
    setRedeemedNotice(`"${item.title}" uchun buyurtmangiz qabul qilindi! Administrator siz bilan bog'lanadi.`);
    setTimeout(() => setRedeemedNotice(null), 3000);
  };

  return (
    <div className={styles.container}>
      {/* 1. Header Banner */}
      <section className={styles.headerSection}>
        <div className={styles.headerText}>
          <div className={styles.pageBadge}>
            <Trophy size={13} />
            <span>Guruh reytingi va Gamifikatsiya</span>
          </div>
          <h1 className={styles.title}>Guruh Reytingi & IT-Coins</h1>
          <p className={styles.subtitle}>
            Davomatda qatnashing (+10 XP), uyga vazifalarni topshiring (+50 XP) va coins to'plab sovg'alarga ega bo'ling!
          </p>
        </div>

        {/* User Balance Card */}
        <div className={styles.userBalanceCard}>
          <div className={styles.balancePillGold}>
            <Coins size={16} />
            <span>{currentCoins} IT-Coins</span>
          </div>
          <div className={styles.balancePillBlue}>
            <Zap size={16} />
            <span>{currentXp} XP Ball</span>
          </div>
        </div>
      </section>

      {/* 2. Switcher Tabs (Reyting vs Sovg'alar do'koni) */}
      <section className={styles.tabsRow}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'LEADERBOARD' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('LEADERBOARD')}
        >
          <Trophy size={16} />
          <span>Guruh Reyting Jadvali</span>
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'SHOP' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('SHOP')}
        >
          <ShoppingBag size={16} />
          <span>Coins Sovg'alar Do'koni</span>
        </button>
      </section>

      {redeemedNotice && (
        <div className={styles.alertSuccess}>
          <CheckCircle2 size={18} />
          <span>{redeemedNotice}</span>
        </div>
      )}

      {activeTab === 'LEADERBOARD' ? (
        <>
          {/* 3. Top 3 Podium */}
          <section className={styles.podiumSection}>
            {/* Top 2 */}
            {top2 && (
              <div className={styles.podiumCard2}>
                <div className={styles.medalSilver}>🥈 2-o'rin</div>
                <div className={styles.podiumAvatar}>
                  {top2.name.charAt(0)}
                  {top2.isCurrentUser && <span className={styles.youBadge}>Siz</span>}
                </div>
                <h3 className={styles.podiumName}>{top2.name}</h3>
                <span className={styles.podiumXp}>{top2.xp} XP</span>
                <span className={styles.podiumCoins}>🪙 {top2.coins} Coins</span>
                <div className={styles.podiumBar2}>
                  <span>2</span>
                </div>
              </div>
            )}

            {/* Top 1 */}
            {top1 && (
              <div className={styles.podiumCard1}>
                <Crown size={28} className={styles.crownGold} />
                <div className={styles.medalGold}>🥇 1-o'rin Chempion</div>
                <div className={styles.podiumAvatarGold}>
                  {top1.name.charAt(0)}
                  {top1.isCurrentUser && <span className={styles.youBadge}>Siz</span>}
                </div>
                <h3 className={styles.podiumName}>{top1.name}</h3>
                <span className={styles.podiumXpGold}>{top1.xp} XP</span>
                <span className={styles.podiumCoins}>🪙 {top1.coins} Coins</span>
                <div className={styles.podiumBar1}>
                  <span>1</span>
                </div>
              </div>
            )}

            {/* Top 3 */}
            {top3 && (
              <div className={styles.podiumCard3}>
                <div className={styles.medalBronze}>🥉 3-o'rin</div>
                <div className={styles.podiumAvatar}>
                  {top3.name.charAt(0)}
                  {top3.isCurrentUser && <span className={styles.youBadge}>Siz</span>}
                </div>
                <h3 className={styles.podiumName}>{top3.name}</h3>
                <span className={styles.podiumXp}>{top3.xp} XP</span>
                <span className={styles.podiumCoins}>🪙 {top3.coins} Coins</span>
                <div className={styles.podiumBar3}>
                  <span>3</span>
                </div>
              </div>
            )}
          </section>

          {/* Current Rank Banner */}
          {currentUserRank && (
            <div className={styles.currentRankBanner}>
              <div className={styles.bannerLeft}>
                <div className={styles.bannerRankCircle}>
                  #{currentUserRank.rank}
                </div>
                <div>
                  <h4>Sizning joriy o'rningiz: {currentUserRank.rank}-o'rin</h4>
                  <p>
                    {currentUserRank.rank > 1
                      ? `1-o'rindagi o'quvchiga yetish uchun yana ${Math.max(10, (top1?.xp || 900) - currentUserRank.xp)} XP kerak!`
                      : "Tabriklaymiz! Siz guruhda yetakchisiz 🏆"}
                  </p>
                </div>
              </div>
              <div className={styles.bannerBadges}>
                {currentUserRank.badges.map((b, i) => (
                  <span key={i} className={styles.bannerBadgeItem}>{b}</span>
                ))}
              </div>
            </div>
          )}

          {/* 4. Leaderboard Table */}
          <section className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <h3>Guruh a'zolari to'liq reytingi</h3>
              <span className={styles.groupTag}>{group?.name || 'Frontend guruhi'}</span>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>O'rin</th>
                    <th>O'quvchi</th>
                    <th>Davomat</th>
                    <th>Vazifalar</th>
                    <th>XP Ball</th>
                    <th>Coins</th>
                    <th>Yutuq nishonlari</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((item) => (
                    <tr
                      key={item.studentId}
                      className={`${styles.tableRow} ${item.isCurrentUser ? styles.tableRowCurrent : ''}`}
                    >
                      <td>
                        <span className={item.rank <= 3 ? styles.rankTop : styles.rankNormal}>
                          {item.rank === 1 ? '🥇 1' : item.rank === 2 ? '🥈 2' : item.rank === 3 ? '🥉 3' : item.rank}
                        </span>
                      </td>
                      <td>
                        <div className={styles.studentCell}>
                          <div className={styles.studentAvatarSmall}>
                            {item.name.charAt(0)}
                          </div>
                          <div className={styles.studentNameCol}>
                            <span className={styles.studentNameText}>
                              {item.name}
                            </span>
                            {item.isCurrentUser && (
                              <span className={styles.youTag}>Siz</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={styles.metricCell}>{item.presentLessons} dars</span>
                      </td>
                      <td>
                        <span className={styles.metricCell}>{item.completedHw} ta</span>
                      </td>
                      <td>
                        <span className={styles.xpText}>{item.xp} XP</span>
                      </td>
                      <td>
                        <span className={styles.coinsText}>🪙 {item.coins}</span>
                      </td>
                      <td>
                        <div className={styles.badgesWrap}>
                          {item.badges.map((b, idx) => (
                            <span key={idx} className={styles.badgePill}>{b}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        /* Coins Shop */
        <section className={styles.shopGrid}>
          {shopItems.map((item) => (
            <div key={item.id} className={styles.shopCard}>
              <div className={styles.shopIconWrap}>
                <span className={styles.shopEmoji}>{item.icon}</span>
              </div>
              <h3 className={styles.shopItemTitle}>{item.title}</h3>
              <p className={styles.shopItemDesc}>{item.desc}</p>

              <div className={styles.shopFooter}>
                <div className={styles.priceBadge}>
                  <Coins size={15} />
                  <span>{item.price} IT-Coins</span>
                </div>
                <button
                  onClick={() => handleRedeem(item)}
                  className={styles.btnRedeem}
                  disabled={currentCoins < item.price}
                >
                  {currentCoins >= item.price ? 'Almashish' : 'Coins yetarli emas'}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};
