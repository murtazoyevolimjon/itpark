'use client';

import React from 'react';
import { Building, Printer, X, CheckCircle } from 'lucide-react';
import { useLanguage } from '../../../hooks/useLanguage';
import styles from './ReceiptModal.module.css';

export interface ReceiptModalData {
  receiptNumber: string;
  studentName: string;
  courseName: string;
  amount: number;
  date: string;
  method: string;
  receivedBy?: string;
  centerName?: string;
  status?: string;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReceiptModalData | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const { t, dict } = useLanguage();
  if (!isOpen || !data) return null;

  const rawCenter = (data.centerName || 'IT Park').trim();
  // Format center title nicely (e.g. "ziyo" -> "ZIYO ACADEMY" or "ZIYO O'QUV MARKAZI")
  const upper = rawCenter.toUpperCase();
  const centerDisplayName =
    upper.includes('ACADEMY') || upper.includes('MARKAZ') || upper.includes('IT PARK')
      ? upper
      : `${upper} ACADEMY`;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.receiptModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.receiptTopHeader}>
          <div className={styles.receiptBadge}>{dict.receiptModal.officialBadge}</div>
          <button className={styles.closeBtn} onClick={onClose} aria-label={t('close')}>
            <X size={18} />
          </button>
        </div>

        {/* Printable Paper Document */}
        <div className={styles.receiptPaper} id="printable-receipt">
          {/* Brand Header */}
          <div className={styles.paperBrandHeader}>
            <div className={styles.brandTitleWrap}>
              <Building size={22} className={styles.brandIcon} />
              <div>
                <h3 className={styles.brandName}>{centerDisplayName}</h3>
                <p className={styles.brandSubtitle}>{dict.receiptModal.officialSubtitle}</p>
              </div>
            </div>
            <div className={styles.receiptIdBox}>
              <span>{dict.receiptModal.receiptNo}</span>
              <strong>{data.receiptNumber}</strong>
            </div>
          </div>

          <div className={styles.paperDivider} />

          {/* Details Grid */}
          <div className={styles.paperDetailsGrid}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{dict.receiptModal.studentFullName}</span>
              <strong className={styles.detailValue}>{data.studentName}</strong>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{dict.receiptModal.courseGroup}</span>
              <strong className={styles.detailValue}>{data.courseName}</strong>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{dict.receiptModal.paymentDate}</span>
              <strong className={styles.detailValue}>{data.date}</strong>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{dict.receiptModal.paymentMethod}</span>
              <strong className={styles.detailValue}>{data.method}</strong>
            </div>
            {data.receivedBy && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{dict.receiptModal.receivedBy}</span>
                <strong className={styles.detailValue}>{data.receivedBy}</strong>
              </div>
            )}
          </div>

          <div className={styles.paperDivider} />

          {/* Total Amount Callout */}
          <div className={styles.paperTotalRow}>
            <span className={styles.totalLabel}>{dict.receiptModal.totalPaid}</span>
            <span className={styles.totalSum}>
              {Number(data.amount || 0).toLocaleString('uz-UZ')} UZS
            </span>
          </div>

          {/* Official Confirmation Sentence */}
          <div className={styles.officialNoticeBox}>
            <CheckCircle size={16} className={styles.noticeIcon} />
            <span>
              {dict.receiptModal.noticeText}
            </span>
          </div>

          {/* Physical Stamp & Signature Area */}
          <div className={styles.stampSignRow}>
            <div className={styles.signColumn}>
              <div>
                <span className={styles.signLine}>{dict.receiptModal.receivedBy} </span>
                <span>{data.receivedBy || 'Administrator'}</span>
              </div>
              <div>
                <span className={styles.signLine}>{dict.receiptModal.signature} </span>
                <span className={styles.signDots}>____________________</span>
              </div>
              <div>
                <span className={styles.signLine}>{dict.receiptModal.date} </span>
                <span>{data.date}</span>
              </div>
            </div>

            <div className={styles.stampBox} title={dict.receiptModal.stampDesc}>
              <span className={styles.stampBoxTitle}>{dict.receiptModal.stampPlace}</span>
              <span className={styles.stampBoxDesc}>{dict.receiptModal.stampDesc}</span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className={styles.receiptActionsRow}>
          <button onClick={handlePrint} className={styles.btnPrint}>
            <Printer size={16} />
            <span>{dict.receiptModal.printBtn}</span>
          </button>
          <button onClick={onClose} className={styles.btnCloseReceipt}>
            {dict.receiptModal.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
