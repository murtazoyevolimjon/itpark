'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useStudentPortal, StudentVideoItem } from '../../hooks/useStudentPortal';
import {
  Video,
  Play,
  Search,
  Download,
  Calendar,
  Clock,
  BookOpen,
  User,
  Sparkles,
  ExternalLink,
  X,
  Share2,
} from 'lucide-react';
import styles from './StudentVideos.module.css';

export const StudentVideos: React.FC = () => {
  const { videos, group } = useStudentPortal();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeVideo, setActiveVideo] = useState<StudentVideoItem | null>(null);

  // Helper to extract YouTube embed URL
  const getYouTubeEmbedUrl = (url?: string): string | null => {
    if (!url) return null;
    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      return match && match[2].length === 11
        ? `https://www.youtube.com/embed/${match[2]}?autoplay=1`
        : null;
    } catch {
      return null;
    }
  };

  // Filter videos
  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          v.title.toLowerCase().includes(q) ||
          (v.topic && v.topic.toLowerCase().includes(q)) ||
          (v.desc && v.desc.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [videos, searchQuery]);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className={styles.container}>
      {/* 1. Header Banner */}
      <section className={styles.headerSection}>
        <div className={styles.headerText}>
          <div className={styles.pageBadge}>
            <Video size={13} />
            <span>Darslar videotekasi</span>
          </div>
          <h1 className={styles.title}>Video darslar</h1>
          <p className={styles.subtitle}>
            Ustoz tomonidan o'tilgan barcha darslar video yozuvlari shu yerda jamlangan. Darslarni qayta tomosha qiling va bilimingizni mustahkamlang.
          </p>
        </div>

        <div className={styles.videoCountCard}>
          <span className={styles.videoCountNum}>{videos.length} ta</span>
          <span className={styles.videoCountLabel}>Dars yozuvi mavjud</span>
        </div>
      </section>

      {/* 2. Search & Controls */}
      <section className={styles.controlsBar}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Mavzu yoki dars nomi bo'yicha qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.groupBadgePill}>
          <span>Guruh: <strong>{group?.name || 'Frontend'}</strong></span>
        </div>
      </section>

      {/* 3. Videos Grid */}
      <section className={styles.videosGrid}>
        {filteredVideos.length === 0 ? (
          <div className={styles.emptyCard}>
            <Video size={40} className={styles.emptyIcon} />
            <h3>Hozircha video darslar topilmadi</h3>
            <p>Ustoz video yuklaganida darsliklar shu yerda avtomatik paydo bo'ladi.</p>
          </div>
        ) : (
          filteredVideos.map((video, idx) => {
            const isEmbeddable = video.videoType === 'link' && getYouTubeEmbedUrl(video.videoUrl);

            return (
              <div
                key={video.id}
                className={styles.videoCard}
                onClick={() => setActiveVideo(video)}
              >
                {/* Thumbnail Preview Box */}
                <div className={styles.thumbnailBox}>
                  <div className={styles.playOverlay}>
                    <div className={styles.playButtonCircle}>
                      <Play size={24} className={styles.playIcon} />
                    </div>
                  </div>
                  <div className={styles.thumbBadge}>
                    #{filteredVideos.length - idx}-Dars
                  </div>
                  {video.fileSize && (
                    <div className={styles.durationBadge}>
                      {formatFileSize(video.fileSize)}
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className={styles.cardBody}>
                  <div className={styles.topicBadgeRow}>
                    <span className={styles.topicBadge}>
                      {video.topic || 'Dasturlash asoslari'}
                    </span>
                    <span className={styles.dateBadge}>{video.createdAt}</span>
                  </div>

                  <h3 className={styles.videoTitle}>{video.title}</h3>
                  <p className={styles.videoDesc}>{video.desc || "Dars tavsifi va amaliyot ko'rsatmalari."}</p>

                  <div className={styles.cardFooter}>
                    <div className={styles.teacherInfo}>
                      <User size={13} className={styles.teacherIcon} />
                      <span>{group?.teacher ? `${group.teacher.firstName} ${group.teacher.lastName}` : 'Ustoz'}</span>
                    </div>

                    <button
                      className={styles.watchBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveVideo(video);
                      }}
                    >
                      <Play size={14} />
                      <span>Ko'rish</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* 4. Cinema Video Player Modal */}
      {activeVideo && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setActiveVideo(null)}
        >
          <div className={styles.cinemaModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTopBar}>
              <div className={styles.modalTopTitle}>
                <span className={styles.modalTopicTag}>
                  {activeVideo.topic || 'Video dars'}
                </span>
                <h2>{activeVideo.title}</h2>
              </div>
              <button
                className={styles.closeBtn}
                onClick={() => setActiveVideo(null)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Video Player Screen */}
            <div className={styles.playerScreen}>
              {activeVideo.videoType === 'link' && getYouTubeEmbedUrl(activeVideo.videoUrl) ? (
                <iframe
                  src={getYouTubeEmbedUrl(activeVideo.videoUrl)!}
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className={styles.videoIframe}
                />
              ) : activeVideo.blobUrl || activeVideo.videoUrl ? (
                <video
                  src={activeVideo.blobUrl || activeVideo.videoUrl}
                  controls
                  autoPlay
                  className={styles.videoElement}
                />
              ) : (
                <div className={styles.noPlayerNotice}>
                  <p>Ushbu videoni to'g'ridan-to'g'ri ko'rib bo'lmaydi.</p>
                  {activeVideo.videoUrl && (
                    <a
                      href={activeVideo.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.externalLinkBtn}
                    >
                      Havolani tashqi oynada ochish
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Below Video Description & Actions */}
            <div className={styles.modalDetails}>
              <div className={styles.modalDetailsLeft}>
                <p className={styles.modalDescText}>{activeVideo.desc}</p>
                <div className={styles.modalMetaRow}>
                  <span className={styles.metaItem}>
                    Yuklangan sana: <strong>{activeVideo.createdAt}</strong>
                  </span>
                  <span className={styles.metaItem}>
                    Guruh: <strong>{activeVideo.groupName || group?.name}</strong>
                  </span>
                </div>
              </div>

              <div className={styles.modalActionsRight}>
                {activeVideo.blobUrl && (
                  <a
                    href={activeVideo.blobUrl}
                    download={activeVideo.fileName || 'video-dars.mp4'}
                    className={styles.downloadBtn}
                  >
                    <Download size={15} />
                    <span>Yuklab olish</span>
                  </a>
                )}
                <Link
                  href="/student/homework"
                  className={styles.goToHwBtn}
                  onClick={() => setActiveVideo(null)}
                >
                  <BookOpen size={15} />
                  <span>Uyga vazifaga o'tish</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
