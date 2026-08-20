import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, AlertCircle, DollarSign } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Card } from '../components/ui/Card/Card';
import { dashboardApi } from '../api/dashboard.api';
import { formatMoney } from '../utils/formatMoney';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import styles from './FinanceSummary.module.css';

export const FinanceSummary: React.FC = () => {
  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['financeSummary'],
    queryFn: dashboardApi.getFinanceSummary,
  });

  const { data: monthlyData, isLoading: isMonthlyLoading } = useQuery({
    queryKey: ['monthlyIncome'],
    queryFn: dashboardApi.getMonthlyIncome,
  });

  const { data: courseData, isLoading: isCourseLoading } = useQuery({
    queryKey: ['incomeByCourse'],
    queryFn: dashboardApi.getIncomeByCourse,
  });

  const isProfitNegative = (summary?.netProfit ?? 0) < 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Moliya Statistika</h2>

      {/* 4 Dotted-Border Cards */}
      <div className={styles.cardsGrid}>
        {/* Kirim */}
        <div className={styles.dottedCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Kirim</span>
            <div className={styles.cardIcon} style={{ color: '#16a34a' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          {isSummaryLoading ? (
            <Skeleton width="120px" height="32px" />
          ) : (
            <span className={styles.cardAmount}>{formatMoney(summary?.totalIncome)}</span>
          )}
        </div>

        {/* Chiqim */}
        <div className={styles.dottedCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Chiqim</span>
            <div className={styles.cardIcon} style={{ color: '#dc2626' }}>
              <TrendingDown size={20} />
            </div>
          </div>
          {isSummaryLoading ? (
            <Skeleton width="120px" height="32px" />
          ) : (
            <span className={styles.cardAmount}>{formatMoney(summary?.totalExpenses)}</span>
          )}
        </div>

        {/* Talaba Qarzi */}
        <div className={styles.dottedCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Talaba Qarzi</span>
            <div className={styles.cardIcon} style={{ color: '#ca8a04' }}>
              <AlertCircle size={20} />
            </div>
          </div>
          {isSummaryLoading ? (
            <Skeleton width="120px" height="32px" />
          ) : (
            <span className={styles.cardAmount}>{formatMoney(summary?.debt)}</span>
          )}
        </div>

        {/* Sof Foyda */}
        <div className={styles.dottedCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Sof Foyda</span>
            <div className={styles.cardIcon} style={{ color: isProfitNegative ? '#dc2626' : '#2b7fff' }}>
              <DollarSign size={20} />
            </div>
          </div>
          {isSummaryLoading ? (
            <Skeleton width="120px" height="32px" />
          ) : (
            <span
              className={`${styles.cardAmount} ${
                isProfitNegative ? styles.negative : styles.positive
              }`}
            >
              {formatMoney(summary?.netProfit)}
            </span>
          )}
        </div>
      </div>

      {/* 2 Charts Grid */}
      <div className={styles.chartsGrid}>
        {/* Monthly Income & Expenses Chart */}
        <Card>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
            Oylik daromad va chiqimlar
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            {isMonthlyLoading ? (
              <Skeleton height="100%" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    formatter={(val: number) => formatMoney(val)}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="income"
                    name="Kirim"
                    stroke="#16a34a"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    name="Chiqim"
                    stroke="#dc2626"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Course Income Bar Chart */}
        <Card>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
            Kurslar bo'yicha daromad
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            {isCourseLoading ? (
              <Skeleton height="100%" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courseData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="courseName" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip formatter={(val: number) => formatMoney(val)} />
                  <Bar dataKey="income" name="Daromad" fill="#2b7fff" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
