'use client';

import React, { useState } from 'react';
import { useStudentPortal } from '../../hooks/useStudentPortal';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  Download,
  QrCode,
  Calendar,
  DollarSign,
  ShieldCheck,
  Building,
  User,
  X,
} from 'lucide-react';
import styles from './StudentPayments.module.css';

interface ReceiptData {
  id: string;
  date: string;
  amount: number;
  method: string;
  status: string;
  courseName: string;
  studentName: string;
  receiptNumber: string;
}

export const StudentPayments: React.FC = () => {
  const { student, group, payments, paymentStats } = useStudentPortal();
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);

  const studentName = student
    ? `${student.firstName} ${student.lastName}`
    : 'Sardor Aliyev';

  // Merge real payments with sample history
  const paymentList: ReceiptData[] = payments.length > 0
    ? payments.map((p, idx) => ({
        id: p.id,
        date: new Date(p.paymentDate).toLocaleDateString('uz-UZ'),
        amount: p.amount,
        method: p.method === 'NAQD' ? 'Naqd pul' : p.method === 'KARTA' ? 'Bank kartasi' : "O'tkazma",
        status: p.status || "To'langan",
        courseName: group?.course?.name || 'Frontend Dasturlash',
        studentName,
        receiptNumber: `ITP-REC-2026-${1000 + idx}`,
      }))
    : [
        {
          id: 'pay-2',
          date: '05.10.2026',
          amount: 600000,
          method: 'Payme / Karta',
          status: "To'langan",
          courseName: group?.course?.name || 'Frontend Web Dasturlash',
          studentName,
          receiptNumber: 'ITP-REC-2026-1042',
        },
        {
          id: 'pay-1',
          date: '05.09.2026',
          amount: 600000,
          method: 'Click / Karta',
          status: "To'langan",
          courseName: group?.course?.name || 'Frontend Web Dasturlash',
          studentName,
          receiptNumber: 'ITP-REC-2026-0918',
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
      {selectedReceipt && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            className={styles.receiptModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.receiptTopHeader}>
              <div className={styles.receiptBadge}>
                Rasmiy to'lov kvitansiyasi
              </div>
              <button
                className={styles.closeBtn}
                onClick={() => setSelectedReceipt(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Printable Receipt Paper */}
            <div className={styles.receiptPaper} id="printable-receipt">
              <div className={styles.paperBrandHeader}>
                <div className={styles.brandTitleWrap}>
                  <Building size={20} className={styles.brandIcon} />
                  <div>
                    <h3>IT PARK ACADEMY</h3>
                    <p>Zamonaviy axborot texnologiyalari ta'lim markazi</p>
                  </div>
                </div>
                <div className={styles.receiptIdBox}>
                  <span>Kvitansiya:</span>
                  <strong>{selectedReceipt.receiptNumber}</strong>
                </div>
              </div>

              <div className={styles.paperDivider} />

              <div className={styles.paperDetailsGrid}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>O'quvchi F.I.SH:</span>
                  <strong className={styles.detailValue}>
                    {selectedReceipt.studentName}
                  </strong>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Kurs yo'nalishi:</span>
                  <strong className={styles.detailValue}>
                    {selectedReceipt.courseName}
                  </strong>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>To'lov sanasi:</span>
                  <strong className={styles.detailValue}>
                    {selectedReceipt.date}
                  </strong>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>To'lov usuli:</span>
                  <strong className={styles.detailValue}>
                    {selectedReceipt.method}
                  </strong>
                </div>
              </div>

              <div className={styles.paperDivider} />

              <div className={styles.paperTotalRow}>
                <span>To'langan summa:</span>
                <span className={styles.totalSum}>
                  {selectedReceipt.amount.toLocaleString()} UZS
                </span>
              </div>

              <div className={styles.paperStampFooter}>
                <div className={styles.qrCodeBox}>
                  <QrCode size={56} className={styles.qrIcon} />
                  <span>QR tekshiruv kodi</span>
                </div>
                <div className={styles.stampSeal}>
                  <div className={styles.stampCircle}>
                    <span>IT PARK</span>
                    <strong>TO'LANGAN</strong>
                    <span>TASDIQLANDI</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className={styles.receiptActionsRow}>
              <button
                onClick={handlePrintReceipt}
                className={styles.btnPrint}
              >
                <Printer size={16} />
                <span>Chop etish (Print)</span>
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className={styles.btnCloseReceipt}
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
