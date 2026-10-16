'use client';

import React, { useState } from 'react';
import { useStudentPortal } from '../../hooks/useStudentPortal';
import { useAuth } from '../../hooks/useAuth';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  DollarSign,
  ShieldCheck,
  Building,
  User,
} from 'lucide-react';
import { ReceiptModal, ReceiptModalData } from '../../components/ui/ReceiptModal/ReceiptModal';
import styles from './StudentPayments.module.css';

export const StudentPayments: React.FC = () => {
  const { student, group, payments, paymentStats } = useStudentPortal();
  const { user } = useAuth();
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptModalData | null>(null);

  const studentName = student
    ? `${student.firstName} ${student.lastName}`
    : 'Sardor Aliyev';

  const centerName = user?.centerName || 'Ziyo';
  const centerPrefix = centerName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'REC';

  // Merge real payments with sample history
  const paymentList: ReceiptModalData[] = payments.length > 0
    ? payments.map((p, idx) => ({
        receiptNumber: `${centerPrefix}-${new Date(p.paymentDate).getFullYear()}-${1000 + idx}`,
        studentName,
        courseName: group?.course?.name || 'Frontend Dasturlash',
        amount: p.amount,
        date: new Date(p.paymentDate).toLocaleDateString('uz-UZ'),
        method: p.method === 'NAQD' ? 'Naqd pul' : p.method === 'KARTA' ? 'Bank kartasi' : "O'tkazma",
        receivedBy: p.receivedBy?.fullName || 'Administrator',
        centerName,
        status: p.status || "To'langan",
      }))
    : [
        {
          receiptNumber: `${centerPrefix}-2026-1042`,
          studentName,
          courseName: group?.course?.name || 'Frontend Web Dasturlash',
          amount: 600000,
          date: '05.10.2026',
          method: 'Payme / Karta',
          receivedBy: 'Administrator',
          centerName,
          status: "To'langan",
        },
        {
          receiptNumber: `${centerPrefix}-2026-0918`,
          studentName,
          courseName: group?.course?.name || 'Frontend Web Dasturlash',
          amount: 600000,
          date: '05.09.2026',
          method: 'Click / Karta',
          receivedBy: 'Administrator',
          centerName,
          status: "To'langan",
        },
      ];

  const handlePrintReceipt = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className={styles.container}>
      {/* 1. Header Banner */}
      <section className={styles.headerSection}>
        <div className={styles.headerText}>
          <div className={styles.pageBadge}>
            <CreditCard size={13} />
            <span>Moliyaviy hisobot</span>
          </div>
          <h1 className={styles.title}>To'lovlar tarixi va Kvitansiyalar</h1>
          <p className={styles.subtitle}>
            Kurs to'lovlari, oylik hisob-kitoblar va rasmiy elektron kvitansiyalarni monitoring qilish.
          </p>
        </div>
      </section>

      {/* 2. Overview Balance Cards */}
      <section className={styles.overviewGrid}>
        <div className={styles.balanceCard}>
          <div className={styles.balanceTop}>
            <span className={styles.balanceLabel}>Oylik kurs to'lovi</span>
            <div className={styles.iconWrapBlue}>
              <CreditCard size={18} />
            </div>
          </div>
          <div className={styles.balanceAmount}>
            {paymentStats.monthlyFee.toLocaleString()} so'm
          </div>
          <span className={styles.balanceSubText}>
            Kurs: {group?.course?.name || 'Frontend Web Dasturlash'}
          </span>
        </div>

        <div className={styles.balanceCard}>
          <div className={styles.balanceTop}>
            <span className={styles.balanceLabel}>Jami to'langan summa</span>
            <div className={styles.iconWrapGreen}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className={styles.balanceAmountGreen}>
            {paymentList.reduce((acc, p) => acc + p.amount, 0).toLocaleString()} so'm
          </div>
          <span className={styles.balanceSubText}>
            Jami {paymentList.length} ta to'lov amalga oshirilgan
          </span>
        </div>

        <div className={styles.balanceCard}>
          <div className={styles.balanceTop}>
            <span className={styles.balanceLabel}>Qarzdorlik holati</span>
            <div
              className={
                paymentStats.debt === 0 ? styles.iconWrapGreen : styles.iconWrapOrange
              }
            >
              {paymentStats.debt === 0 ? (
                <ShieldCheck size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
            </div>
          </div>
          <div
            className={
              paymentStats.debt === 0
                ? styles.balanceAmountGreen
                : styles.balanceAmountOrange
            }
          >
            {paymentStats.debt === 0
              ? "Qarzdorlik yo'q"
              : `${paymentStats.debt.toLocaleString()} so'm`}
          </div>
          <span className={styles.balanceSubText}>
            {paymentStats.debt === 0
              ? "Keyingi to'lov: 1-noyabr 2026"
              : "To'lov muddati: 15-oktyabr 2026"}
          </span>
        </div>
      </section>

      {/* 3. Payment History Table */}
      <section className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <div className={styles.tableTitleWrap}>
            <FileText size={18} className={styles.cardIconCyan} />
            <h2>Barcha to'lovlar ro'yxati</h2>
          </div>
          <span className={styles.totalBadge}>
            Jami: {paymentList.length} ta to'lov
          </span>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Kvitansiya #</th>
                <th>Sana</th>
                <th>Kurs nomi</th>
                <th>To'lov summasi</th>
                <th>Usul</th>
                <th>Holat</th>
                <th>Kvitansiya</th>
              </tr>
            </thead>
            <tbody>
              {paymentList.map((pay) => (
                <tr key={pay.id} className={styles.tableRow}>
                  <td>
                    <span className={styles.receiptCode}>{pay.receiptNumber}</span>
                  </td>
                  <td>
                    <span className={styles.dateText}>{pay.date}</span>
                  </td>
                  <td>
                    <span className={styles.courseNameText}>{pay.courseName}</span>
                  </td>
                  <td>
                    <span className={styles.amountText}>
                      {pay.amount.toLocaleString()} so'm
                    </span>
                  </td>
                  <td>
                    <span className={styles.methodBadge}>{pay.method}</span>
                  </td>
                  <td>
                    <span className={styles.statusBadgePaid}>
                      <CheckCircle2 size={12} />
                      <span>{pay.status}</span>
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => setSelectedReceipt(pay)}
                      className={styles.viewReceiptBtn}
                    >
                      <FileText size={13} />
                      <span>Kvitansiya</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Interactive Official Payment Receipt Modal */}
      <ReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        data={selectedReceipt}
      />
    </div>
  );
};

