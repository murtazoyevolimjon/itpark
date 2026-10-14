'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../hooks/useLanguage';
import { groupsApi } from '../api/groups.api';
import { Group } from '../types';
import { saveVideoBlob, getVideoBlob, deleteVideoBlob } from '../utils/videoStorage';
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
  UploadCloud,
  FileVideo,
  X,
  Download,
  Link as LinkIcon,
} from 'lucide-react';
import styles from './TeacherVideos.module.css';

interface VideoLessonItem {
  id: string;
  groupId: string;
  groupName: string;
  courseName?: string;
  title: string;
  videoType: 'file' | 'link';
  videoUrl?: string;
  fileName?: string;
  fileSize?: number;
  blobUrl?: string;
  desc?: string;
  createdAt: string;
}

export const TeacherVideos: React.FC = () => {
  const { dict } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [videoMode, setVideoMode] = useState<'file' | 'link'>('file'); // Default to 'file' upload!
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [targetGroupId, setTargetGroupId] = useState<string>('');
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [videoList, setVideoList] = useState<VideoLessonItem[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [topicError, setTopicError] = useState(false);
  const [groupLessons, setGroupLessons] = useState<{ id: string; title: string }[]>([]);

  // Fetch groups
  const { data: groupsData } = useQuery({
    queryKey: ['teacherGroupsList'],
    queryFn: () => groupsApi.getAll({ limit: 100 }),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const allGroups: Group[] = groupsData?.data || [];

  useEffect(() => {
    if (allGroups.length > 0 && !targetGroupId) {
      setTargetGroupId(allGroups[0].id);
    }
  }, [allGroups, targetGroupId]);

  // Load group lesson topics for suggestions
  useEffect(() => {
    if (!targetGroupId) return;
    try {
      const saved = localStorage.getItem(`group_lessons_${targetGroupId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setGroupLessons(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }
    setGroupLessons([]);
  }, [targetGroupId]);

  // Load saved videos from localStorage and restore blobs from IndexedDB
  useEffect(() => {
    const loadVideos = async () => {
      try {
        const saved = localStorage.getItem('all_teacher_videos');
        if (saved) {
          const parsed: VideoLessonItem[] = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Restore blob URLs for local files
            const restored = await Promise.all(
              parsed.map(async (v) => {
                if (v.videoType === 'file') {
                  const blob = await getVideoBlob(v.id);
                  if (blob) {
                    return { ...v, blobUrl: URL.createObjectURL(blob) };
                  }
                }
                return v;
              })
            );
            setVideoList(restored);
            return;
          }
        }

        // Default sample if empty
        const samples: VideoLessonItem[] = [
          {
            id: 'v-sample-1',
            groupId: allGroups[0]?.id || 'g1',
            groupName: allGroups[0]?.name || 'Guruh',
            courseName: allGroups[0]?.course?.name || 'Frontend',
            title: '1-Dars: HTML5 Semantik teglari va Zamonaviy CSS arxitekturasi',
            videoType: 'link',
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
    };

    loadVideos();
  }, [allGroups]);

  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // YouTube embed helper
  const getEmbedUrl = (url?: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11
      ? `https://www.youtube.com/embed/${match[2]}`
      : null;
  };

  // Handle video file selection
  const handleSelectVideoFile = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('video/') && !['mp4', 'mov', 'webm', 'mkv', 'avi'].some((ext) => file.name.toLowerCase().endsWith(ext))) {
      setErrorMessage("Faqat video formatidagi fayllarni yuklang (MP4, MOV, WebM, MKV)!");
      return;
    }
    setErrorMessage('');
    setSelectedVideoFile(file);
    const objUrl = URL.createObjectURL(file);
    setPreviewVideoUrl(objUrl);
  };

  const handleClearSelectedFile = () => {
    setSelectedVideoFile(null);
    if (previewVideoUrl) {
      URL.revokeObjectURL(previewVideoUrl);
      setPreviewVideoUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Save Video
  const handleSaveVideo = async () => {
    if (!videoTitle.trim()) {
      setTopicError(true);
      setErrorMessage("Video dars mavzusini kiritish majburiy! Mavzusiz video yuklab bo'lmaydi.");
      return;
    }

    if (videoMode === 'file' && !selectedVideoFile) {
      setErrorMessage("Iltimos, kompyuteringizdan video faylni tanlang!");
      return;
    }

    if (videoMode === 'link' && !videoUrl.trim()) {
      setErrorMessage(dict.teacher?.videoUrlPlaceholder || 'Video havolasini kiriting');
      return;
    }

    const targetGroup = allGroups.find((g) => g.id === targetGroupId) || allGroups[0];
    const newId = 'v-' + Date.now();

    let newBlobUrl: string | undefined = undefined;

    if (videoMode === 'file' && selectedVideoFile) {
      await saveVideoBlob(newId, selectedVideoFile);
      newBlobUrl = URL.createObjectURL(selectedVideoFile);
    }

    const newVideo: VideoLessonItem = {
      id: newId,
      groupId: targetGroup?.id || 'g-custom',
      groupName: targetGroup?.name || 'Guruh',
      courseName: targetGroup?.course?.name,
      title: videoTitle.trim(),
      videoType: videoMode,
      videoUrl: videoMode === 'link' ? videoUrl.trim() : undefined,
      fileName: selectedVideoFile?.name,
      fileSize: selectedVideoFile?.size,
      blobUrl: newBlobUrl,
      desc: videoDesc.trim(),
      createdAt: new Date().toLocaleDateString('uz-UZ'),
    };

    const updated = [newVideo, ...videoList];
    setVideoList(updated);

    // Save metadata without blobUrl
    const metadataOnly = updated.map(({ blobUrl, ...rest }) => rest);
    try {
      localStorage.setItem('all_teacher_videos', JSON.stringify(metadataOnly));
      if (newVideo.groupId) {
        localStorage.setItem(`group_videos_${newVideo.groupId}`, JSON.stringify(metadataOnly));
      }
    } catch {
      // ignore
    }

    // Reset form
    setVideoTitle('');
    setVideoUrl('');
    setVideoDesc('');
    handleClearSelectedFile();
    setErrorMessage('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const handleDeleteVideo = async (id: string) => {
    await deleteVideoBlob(id);
    const updated = videoList.filter((v) => v.id !== id);
    setVideoList(updated);

    const metadataOnly = updated.map(({ blobUrl, ...rest }) => rest);
    try {
      localStorage.setItem('all_teacher_videos', JSON.stringify(metadataOnly));
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
            Kompyuteringizdan video yuklash yoki havolalar orqali darslarni joylashtirish
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
              <span>Video dars muvaffaqiyatli saqlandi va o'quvchilarga ko'rinadi!</span>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className={styles.modeTabsRow}>
            <button
              type="button"
              className={`${styles.modeTabBtn} ${videoMode === 'file' ? styles.modeTabBtnActive : ''}`}
              onClick={() => {
                setVideoMode('file');
                setErrorMessage('');
              }}
            >
              <UploadCloud size={16} />
              <span>Video fayl yuklash</span>
            </button>
            <button
              type="button"
              className={`${styles.modeTabBtn} ${videoMode === 'link' ? styles.modeTabBtnActive : ''}`}
              onClick={() => {
                setVideoMode('link');
                setErrorMessage('');
              }}
            >
              <LinkIcon size={15} />
              <span>Havola orqali</span>
            </button>
          </div>

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <label className={styles.fieldLabel} style={{ marginBottom: 0 }}>
                {dict.teacher?.videoTitle || 'Video dars mavzusi'}{' '}
                <span style={{ color: '#ef4444', fontWeight: 800 }}>* (Majburiy)</span>
              </label>
              {groupLessons.length > 0 && (
                <span style={{ fontSize: '11px', color: '#0d9488', fontWeight: 600 }}>
                  Tayyor mavzular mavjud
                </span>
              )}
            </div>
            <input
              type="text"
              className={`${styles.inputField} ${topicError ? styles.inputFieldError : ''}`}
              placeholder={dict.teacher?.videoTitlePlaceholder || "Masalan: 1-Mavzu: React Hooks va Lifecycle"}
              value={videoTitle}
              onChange={(e) => {
                setVideoTitle(e.target.value);
                if (topicError && e.target.value.trim()) setTopicError(false);
              }}
            />

            {topicError && (
              <div className={styles.fieldErrorText}>
                <AlertCircle size={13} />
                <span>Video dars mavzusini kiritish majburiy!</span>
              </div>
            )}

            {/* Quick topics suggestion pills */}
            {groupLessons.length > 0 && (
              <div className={styles.topicSuggestionWrap}>
                <span className={styles.topicSuggestionTitle}>Guruh mavzularidan tezkor tanlash:</span>
                <div className={styles.topicPillsList}>
                  {groupLessons.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      className={styles.topicPill}
                      onClick={() => {
                        setVideoTitle(l.title);
                        setTopicError(false);
                      }}
                    >
                      <Film size={12} />
                      <span>{l.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mode 1: Direct Video File Upload */}
          {videoMode === 'file' ? (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                Kompyuterdan video fayl tanlang
              </label>

              {!selectedVideoFile ? (
                <div
                  className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleSelectVideoFile(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="video/*,.mp4,.mov,.webm,.mkv,.avi"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSelectVideoFile(file);
                    }}
                  />
                  <div className={styles.dropZoneIcon}>
                    <FileVideo size={28} />
                  </div>
                  <div className={styles.dropZoneText}>
                    <span className={styles.dropZoneTitle}>
                      Video faylni bu yerga tashlang yoki bosing
                    </span>
                    <span className={styles.dropZoneSub}>
                      MP4, MOV, WebM, MKV (cheklanmagan hajm)
                    </span>
                  </div>
                </div>
              ) : (
                <div className={styles.selectedFileWrapper}>
                  {previewVideoUrl && (
                    <div className={styles.previewContainer}>
                      <video
                        src={previewVideoUrl}
                        controls
                        className={styles.previewVideo}
                      />
                    </div>
                  )}

                  <div className={styles.selectedFileCard}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <FileVideo size={24} color="#0284c7" />
                      <div style={{ minWidth: 0 }}>
                        <div className={styles.selectedFileName} title={selectedVideoFile.name}>
                          {selectedVideoFile.name}
                        </div>
                        <div className={styles.selectedFileSize}>
                          {formatFileSize(selectedVideoFile.size)} • <CheckCircle size={11} color="#16a34a" /> Tanlandi
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={handleClearSelectedFile}
                      title="Boshqa fayl tanlash"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Mode 2: Link Input */
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
          )}

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
                const isFile = video.videoType === 'file';
                const embedUrl = !isFile ? getEmbedUrl(video.videoUrl) : null;

                return (
                  <div key={video.id} className={styles.videoItem}>
                    {/* Video Player */}
                    {isFile && video.blobUrl ? (
                      <div className={styles.nativePlayerWrapper}>
                        <video
                          src={video.blobUrl}
                          controls
                          playsInline
                          preload="metadata"
                          className={styles.nativeVideo}
                        />
                      </div>
                    ) : embedUrl ? (
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
                        {isFile && video.fileSize && (
                          <span className={styles.sizeBadge}>
                            {formatFileSize(video.fileSize)}
                          </span>
                        )}
                      </div>

                      <h4 className={styles.itemTitle}>{video.title}</h4>
                      {video.desc && <p className={styles.itemDesc}>{video.desc}</p>}

                      <div className={styles.videoActionsRow}>
                        {isFile && video.blobUrl ? (
                          <a
                            href={video.blobUrl}
                            download={video.fileName || `${video.title}.mp4`}
                            className={styles.downloadVideoBtn}
                            title="Videoni kompyuterga yuklab olish"
                          >
                            <Download size={14} />
                            <span>Yuklab olish</span>
                          </a>
                        ) : video.videoUrl ? (
                          <a
                            href={video.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.watchLink}
                          >
                            <ExternalLink size={14} />
                            <span>{dict.teacher?.watchVideo || "Videoni ko'rish"}</span>
                          </a>
                        ) : null}

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
