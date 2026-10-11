'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../hooks/useLanguage';
import { groupsApi } from '../api/groups.api';
import { Group } from '../types';
import {
  Video,
  Play,
  Plus,
  ExternalLink,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle,
  Film,
} from 'lucide-react';
import styles from './TeacherVideos.module.css';

interface VideoLessonItem {
  id: string;
  groupId: string;
  groupName: string;
  courseName?: string;
  title: string;
  videoUrl: string;
  desc?: string;
  createdAt: string;
}

export const TeacherVideos: React.FC = () => {
  const { dict } = useLanguage();

  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [targetGroupId, setTargetGroupId] = useState<string>('');
  const [videoList, setVideoList] = useState<VideoLessonItem[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch groups
  const { data: groupsData } = useQuery({
    queryKey: ['teacherGroupsList'],
    queryFn: () => groupsApi.getAll({ limit: 100 }),
  });

  const allGroups: Group[] = groupsData?.data || [];

  useEffect(() => {
    if (allGroups.length > 0 && !targetGroupId) {
      setTargetGroupId(allGroups[0].id);
    }
  }, [allGroups, targetGroupId]);

  // Load saved videos from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('all_teacher_videos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setVideoList(parsed);
          return;
        }
      }

      // Default sample video lesson
      const samples: VideoLessonItem[] = [
        {
          id: 'v-sample-1',
          groupId: allGroups[0]?.id || 'g1',
          groupName: allGroups[0]?.name || 'Dush-Chor-Juma 16:00 FRONTEND',
          courseName: 'Frontend',
          title: '1-Dars: HTML5 Semantik teglari va Zamonaviy CSS arxitekturasi',
          videoUrl: 'https://www.youtube.com/watch?v=UB1O30fR-EE',
          desc: "Kursga kirish darsi. Ushbu darsda HTML5 ning asosiy teglari va zamonaviy CSS Flexbox texnologiyalari ko'rib chiqilgan.",
          createdAt: '08.10.2026',
        },
      ];
      setVideoList(samples);
      localStorage.setItem('all_teacher_videos', JSON.stringify(samples));
    } catch {
      // ignore
    }
  }, [allGroups]);

  // YouTube embed helper
  const getEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11
      ? `https://www.youtube.com/embed/${match[2]}`
      : null;
  };

  const handleSaveVideo = () => {
    if (!videoTitle.trim()) {
      setErrorMessage(dict.teacher?.videoTitlePlaceholder || 'Video dars mavzusini kiriting');
      return;
    }
    if (!videoUrl.trim()) {
      setErrorMessage(dict.teacher?.videoUrlPlaceholder || 'Video havolasini kiriting');
      return;
    }

    const targetGroup = allGroups.find((g) => g.id === targetGroupId) || allGroups[0];

    const newVideo: VideoLessonItem = {
      id: 'v-' + Date.now(),
      groupId: targetGroup?.id || 'g-custom',
      groupName: targetGroup?.name || 'Guruh',
      courseName: targetGroup?.course?.name,
      title: videoTitle.trim(),
      videoUrl: videoUrl.trim(),
      desc: videoDesc.trim(),
      createdAt: new Date().toLocaleDateString('uz-UZ'),
    };

    const updated = [newVideo, ...videoList];
    setVideoList(updated);
    try {
      localStorage.setItem('all_teacher_videos', JSON.stringify(updated));
      if (newVideo.groupId) {
        localStorage.setItem(`group_videos_${newVideo.groupId}`, JSON.stringify(updated));
      }
    } catch {
      // ignore
    }

    setVideoTitle('');
    setVideoUrl('');
    setVideoDesc('');
    setErrorMessage('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDeleteVideo = (id: string) => {
    const updated = videoList.filter((v) => v.id !== id);
    setVideoList(updated);
    try {
      localStorage.setItem('all_teacher_videos', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const filteredVideos = useMemo(() => {
    if (selectedGroupId === 'all') return videoList;
    return videoList.filter((v) => v.groupId === selectedGroupId);
  }, [videoList, selectedGroupId]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>
            {dict.teacher?.videos || 'Videolar'}
          </h2>
          <p className={styles.pageSubtitle}>
            O'quvchilar uchun video darslar va yozib olingan amaliy mashg'ulotlar
          </p>
        </div>

        {/* Group Filter Bar */}
        <div className={styles.groupFilterWrap}>
          <label className={styles.filterLabel}>
            {dict.teacher?.selectGroup || 'Guruh:'}
          </label>
          <select
            className={styles.groupSelect}
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          >
            <option value="all">
              {dict.teacher?.allGroups || 'Barcha guruhlar'} ({videoList.length})
            </option>
            {allGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.contentGrid}>
        {/* Left: Add Video Form */}
        <div className={styles.createCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderIcon}>
              <Plus size={18} />
            </div>
            <h3 className={styles.cardTitle}>
              {dict.teacher?.createVideo || 'Yangi video dars qo\'shish'}
            </h3>
          </div>

          {errorMessage && (
            <div className={styles.errorAlert}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {saveSuccess && (
            <div className={styles.successAlert}>
              <CheckCircle size={16} />
              <span>Video dars muvaffaqiyatli saqlandi!</span>
            </div>
          )}

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {dict.teacher?.selectGroup || 'Guruhni tanlang'}
            </label>
            <select
              className={styles.inputField}
              value={targetGroupId}
              onChange={(e) => setTargetGroupId(e.target.value)}
            >
              {allGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} {g.course?.name ? `(${g.course.name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {dict.teacher?.videoTitle || 'Video dars mavzusi'}
            </label>
            <input
              type="text"
              className={styles.inputField}
              placeholder={dict.teacher?.videoTitlePlaceholder || "Masalan: React Hooks va Lifecycle 1-dars"}
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {dict.teacher?.videoUrl || 'Video havolasi (YouTube, Vimeo, Drive)'}
            </label>
            <input
              type="url"
              className={styles.inputField}
              placeholder={dict.teacher?.videoUrlPlaceholder || 'https://www.youtube.com/watch?v=...'}
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {dict.teacher?.videoDesc || 'Qisqacha tavsif'}
            </label>
            <textarea
              className={styles.textAreaField}
              rows={3}
              placeholder={dict.teacher?.videoDescPlaceholder || "Video dars bo'yicha qo'shimcha ma'lumot..."}
              value={videoDesc}
              onChange={(e) => setVideoDesc(e.target.value)}
            />
          </div>

          <button
            type="button"
            className={styles.saveVideoBtn}
            onClick={handleSaveVideo}
          >
            {dict.teacher?.saveLesson || 'Video darsni saqlash'}
          </button>
        </div>

        {/* Right: Video List */}
        <div className={styles.listCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderIcon}>
              <Film size={18} />
            </div>
            <h3 className={styles.cardTitle}>
              {dict.teacher?.videoList || 'Video darslar ro\'yxati'} ({filteredVideos.length})
            </h3>
          </div>

          {filteredVideos.length === 0 ? (
            <div className={styles.emptyState}>
              <Film size={42} className={styles.emptyIcon} />
              <p className={styles.emptyText}>
                {dict.teacher?.noVideosYet || 'Hozircha video darslar kiritilmagan.'}
              </p>
            </div>
          ) : (
            <div className={styles.videoGrid}>
              {filteredVideos.map((video) => {
                const embedUrl = getEmbedUrl(video.videoUrl);
                return (
                  <div key={video.id} className={styles.videoItem}>
                    {embedUrl ? (
                      <div className={styles.videoPlayerWrapper}>
                        <iframe
                          src={embedUrl}
                          title={video.title}
                          className={styles.videoIframe}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div className={styles.videoPlaceholderBanner}>
                        <Play size={32} className={styles.playIcon} />
                      </div>
                    )}

                    <div className={styles.videoItemBody}>
                      <div className={styles.badgesRow}>
                        <span className={styles.groupBadge}>
                          {video.groupName}
                        </span>
                        {video.courseName && (
                          <span className={styles.courseBadge}>
                            {video.courseName}
                          </span>
                        )}
                        <span className={styles.dateBadge}>
                          <Calendar size={12} /> {video.createdAt}
                        </span>
                      </div>

                      <h4 className={styles.itemTitle}>{video.title}</h4>
                      {video.desc && <p className={styles.itemDesc}>{video.desc}</p>}

                      <div className={styles.videoActionsRow}>
                        <a
                          href={video.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.watchLink}
                        >
                          <ExternalLink size={14} />
                          <span>{dict.teacher?.watchVideo || "Videoni ko'rish"}</span>
                        </a>

                        <button
                          type="button"
                          className={styles.deleteVideoBtn}
                          onClick={() => handleDeleteVideo(video.id)}
                          title="O'chirish"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
