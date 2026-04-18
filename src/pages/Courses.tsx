import { useState } from 'react';
import {
  Plus, Edit, Trash2, Play, Lock, Save, X, ChevronDown, ChevronRight,
  FileText, GripVertical, Video as VideoIcon, BookOpen, Star, DollarSign,
  Tag, User, List, AlertCircle, CheckCircle2, Paperclip, ExternalLink, Download,
} from 'lucide-react';
import type { Course, Module, SubModule, Video, Resource, CourseCategory, CourseDifficulty, ResourceType } from '../types';
import FileUpload, { type UploadResult } from '../components/FileUpload';

// ─── helpers ──────────────────────────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const fmtDuration = (s: number) =>
  s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const CATEGORIES: CourseCategory[] = ['Business', 'Marketing', 'Technology', 'Finance', 'Personal Development', 'Social Media', 'Other'];
const DIFFICULTIES: CourseDifficulty[] = ['Beginner', 'Intermediate', 'Advanced'];

function guessResourceType(url: string, file?: File): ResourceType {
  const name = file?.name ?? url;
  if (/\.pdf$/i.test(name)) return 'pdf';
  if (/\.(doc|docx)$/i.test(name)) return 'doc';
  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(name)) return 'image';
  return 'other';
}

// ─── seed data ────────────────────────────────────────────────────────────────
const seed: Course[] = [
  {
    id: '1', slug: 'first-10k-online', status: 'published',
    title: 'Make Your First ₦10k–₦50k Online',
    description: 'The ultimate beginner guide to earning money online with proven strategies.',
    thumbnail: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=600&h=400&fit=crop',
    price: 15000, category: 'Business', difficulty: 'Beginner',
    instructor: 'Selliberation Team', previewVideoUrl: '',
    whatYouLearn: ['Identify profitable niches', 'Build an audience', 'Start earning online'],
    modules: [
      {
        id: 'm1', courseId: '1', orderIndex: 0, isFree: true,
        title: 'Introduction', description: 'Getting started with online income.',
        submodules: [{
          id: 's1', moduleId: 'm1', orderIndex: 0, resources: [],
          title: 'What is Online Income?', description: 'Understanding various ways to earn online.',
          videos: [{ id: 'v1', submoduleId: 's1', title: 'Welcome Video', videoUrl: '', duration: 300, orderIndex: 0 }],
        }],
      },
      {
        id: 'm2', courseId: '1', orderIndex: 1, isFree: false,
        title: 'Getting Started', description: 'Choosing your niche and setting up.',
        submodules: [{
          id: 's2', moduleId: 'm2', orderIndex: 0, resources: [],
          title: 'Choosing Your Niche', description: 'How to pick a profitable niche.',
          videos: [{ id: 'v2', submoduleId: 's2', title: 'Niche Selection Guide', videoUrl: '', duration: 600, orderIndex: 0 }],
        }],
      },
    ],
  },
  {
    id: '2', slug: 'whatsapp-monetization', status: 'published',
    title: 'WhatsApp Monetization Basics',
    description: 'Turn your WhatsApp into a money-making machine.',
    thumbnail: 'https://images.unsplash.com/photo-1611746872915-64382b5c2b36?w=600&h=400&fit=crop',
    price: 10000, category: 'Marketing', difficulty: 'Beginner',
    instructor: 'Selliberation Team', previewVideoUrl: '',
    whatYouLearn: ['Set up WhatsApp Business', 'Build a broadcast list', 'Create viral offers'],
    modules: [{
      id: 'm3', courseId: '2', orderIndex: 0, isFree: true,
      title: 'Getting Started', description: 'Setting up WhatsApp Business for profit.',
      submodules: [{
        id: 's3', moduleId: 'm3', orderIndex: 0, resources: [],
        title: 'WhatsApp Business Setup', description: 'Step-by-step business profile setup.',
        videos: [{ id: 'v3', submoduleId: 's3', title: 'Business Setup Tutorial', videoUrl: '', duration: 400, orderIndex: 0 }],
      }],
    }],
  },
];

// ─── default forms ────────────────────────────────────────────────────────────
const dfCourse = (): Omit<Course, 'id' | 'slug' | 'modules'> => ({
  title: '', description: '', thumbnail: '', status: 'draft',
  price: 0, category: 'Business', difficulty: 'Beginner',
  instructor: '', previewVideoUrl: '', whatYouLearn: [],
});
const dfModule = (): Pick<Module, 'title' | 'description' | 'isFree'> => ({ title: '', description: '', isFree: false });
const dfSub = (): Pick<SubModule, 'title' | 'description'> => ({ title: '', description: '' });
const dfVideo = (): Pick<Video, 'title' | 'videoUrl' | 'duration'> => ({ title: '', videoUrl: '', duration: 0 });

// ─── small helpers ────────────────────────────────────────────────────────────
const Badge = ({ green, children }: { green?: boolean; children: React.ReactNode }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${green ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{children}</span>
);
const DiffBadge = ({ d }: { d: CourseDifficulty }) => {
  const m = { Beginner: 'bg-emerald-100 text-emerald-700', Intermediate: 'bg-amber-100 text-amber-700', Advanced: 'bg-red-100 text-red-700' };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${m[d]}`}>{d}</span>;
};
const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>{children}</div>
);
const inputCls = "w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition";
const selectCls = `${inputCls} bg-white`;

// ─── Modal ────────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, onSave, saveLabel = 'Save', wide = false, saving = false, children }: {
  title: string; onClose: () => void; onSave: () => void; saveLabel?: string; wide?: boolean; saving?: boolean; children: React.ReactNode;
}) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className={`bg-white rounded-2xl shadow-2xl flex flex-col w-full ${wide ? 'max-w-2xl' : 'max-w-md'}`} style={{ maxHeight: '92vh' }}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition"><X size={20} className="text-gray-400" /></button>
      </div>
      <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">{children}</div>
      <div className="px-6 py-4 border-t border-gray-100 flex gap-2 shrink-0">
        <button onClick={onClose} className="flex-1 border border-gray-300 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
        <button onClick={onSave} disabled={saving}
          className="flex-1 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-60"
          style={{ background: '#F5820A' }}>
          <Save size={15} /> {saveLabel}
        </button>
      </div>
    </div>
  </div>
);

// ─── Resource type icon ───────────────────────────────────────────────────────
const ResIcon = ({ t }: { t: ResourceType }) => {
  if (t === 'pdf') return <FileText size={13} className="text-red-400 shrink-0" />;
  if (t === 'doc') return <FileText size={13} className="text-blue-400 shrink-0" />;
  return <Paperclip size={13} className="text-gray-400 shrink-0" />;
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function Courses() {
  const [courses, setCourses] = useState<Course[]>(seed);

  // Expansion state
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedSubmodules, setExpandedSubmodules] = useState<Set<string>>(new Set());
  const toggleSet = (s: Set<string>, id: string) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; };

  // ── Course modal ──────────────────────────────────────────────────────────
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState(dfCourse());
  const [thumbnailUpload, setThumbnailUpload] = useState<UploadResult | null>(null);
  const [previewUpload, setPreviewUpload] = useState<UploadResult | null>(null);
  const [wylInput, setWylInput] = useState('');

  const openCourseModal = (course?: Course) => {
    setEditingCourse(course ?? null);
    setCourseForm(course ? {
      title: course.title, description: course.description, thumbnail: course.thumbnail,
      status: course.status, price: course.price, category: course.category,
      difficulty: course.difficulty, instructor: course.instructor,
      previewVideoUrl: course.previewVideoUrl, whatYouLearn: [...course.whatYouLearn],
    } : dfCourse());
    setThumbnailUpload(course?.thumbnail ? { url: course.thumbnail } : null);
    setPreviewUpload(course?.previewVideoUrl ? { url: course.previewVideoUrl } : null);
    setWylInput('');
    setShowCourseModal(true);
  };

  const saveCourse = () => {
    const wyl = courseForm.whatYouLearn.filter(w => w.trim());
    if (!courseForm.title.trim()) return;
    const thumbnail = thumbnailUpload?.url ?? courseForm.thumbnail;
    const previewVideoUrl = previewUpload?.url ?? courseForm.previewVideoUrl;
    if (editingCourse) {
      setCourses(cs => cs.map(c => c.id === editingCourse.id ? { ...c, ...courseForm, thumbnail, previewVideoUrl, whatYouLearn: wyl } : c));
    } else {
      const slug = courseForm.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      setCourses(cs => [...cs, { id: uid(), slug, ...courseForm, thumbnail, previewVideoUrl, whatYouLearn: wyl, modules: [] }]);
    }
    setShowCourseModal(false);
  };

  const deleteCourse = (id: string) => { if (confirm('Delete this course and all its content?')) setCourses(cs => cs.filter(c => c.id !== id)); };
  const addWyl = () => { if (wylInput.trim()) { setCourseForm(f => ({ ...f, whatYouLearn: [...f.whatYouLearn, wylInput.trim()] })); setWylInput(''); } };
  const removeWyl = (i: number) => setCourseForm(f => ({ ...f, whatYouLearn: f.whatYouLearn.filter((_, idx) => idx !== i) }));

  // ── Module modal ──────────────────────────────────────────────────────────
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [modCourseId, setModCourseId] = useState('');
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleForm, setModuleForm] = useState(dfModule());

  const openModuleModal = (courseId: string, mod?: Module) => {
    setModCourseId(courseId);
    setEditingModule(mod ?? null);
    setModuleForm(mod ? { title: mod.title, description: mod.description, isFree: mod.isFree } : dfModule());
    setShowModuleModal(true);
  };
  const saveModule = () => {
    if (!moduleForm.title.trim()) return;
    setCourses(cs => cs.map(c => {
      if (c.id !== modCourseId) return c;
      if (editingModule) return { ...c, modules: c.modules.map(m => m.id === editingModule.id ? { ...m, ...moduleForm } : m) };
      return { ...c, modules: [...c.modules, { id: uid(), courseId: modCourseId, orderIndex: c.modules.length, submodules: [], ...moduleForm }] };
    }));
    setShowModuleModal(false);
  };
  const deleteModule = (courseId: string, modId: string) => {
    if (confirm('Delete this module and all its content?'))
      setCourses(cs => cs.map(c => c.id === courseId ? { ...c, modules: c.modules.filter(m => m.id !== modId) } : c));
  };

  // ── Submodule modal ───────────────────────────────────────────────────────
  const [showSubModal, setShowSubModal] = useState(false);
  const [subModuleId, setSubModuleId] = useState('');
  const [subCourseId, setSubCourseId] = useState('');
  const [editingSub, setEditingSub] = useState<SubModule | null>(null);
  const [subForm, setSubForm] = useState(dfSub());

  const openSubModal = (courseId: string, moduleId: string, sub?: SubModule) => {
    setSubCourseId(courseId); setSubModuleId(moduleId); setEditingSub(sub ?? null);
    setSubForm(sub ? { title: sub.title, description: sub.description } : dfSub());
    setShowSubModal(true);
  };
  const saveSub = () => {
    if (!subForm.title.trim()) return;
    setCourses(cs => cs.map(c => c.id !== subCourseId ? c : {
      ...c, modules: c.modules.map(m => {
        if (m.id !== subModuleId) return m;
        if (editingSub) return { ...m, submodules: m.submodules.map(s => s.id === editingSub.id ? { ...s, ...subForm } : s) };
        return { ...m, submodules: [...m.submodules, { id: uid(), moduleId: subModuleId, orderIndex: m.submodules.length, videos: [], resources: [], ...subForm }] };
      }),
    }));
    setShowSubModal(false);
  };
  const deleteSub = (cId: string, mId: string, sId: string) => {
    if (confirm('Delete this submodule and its content?'))
      setCourses(cs => cs.map(c => c.id !== cId ? c : { ...c, modules: c.modules.map(m => m.id !== mId ? m : { ...m, submodules: m.submodules.filter(s => s.id !== sId) }) }));
  };

  // ── Video modal ───────────────────────────────────────────────────────────
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [vidCourseId, setVidCourseId] = useState('');
  const [vidModuleId, setVidModuleId] = useState('');
  const [vidSubId, setVidSubId] = useState('');
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [videoForm, setVideoForm] = useState(dfVideo());
  const [videoUpload, setVideoUpload] = useState<UploadResult | null>(null);

  const openVideoModal = (cId: string, mId: string, sId: string, vid?: Video) => {
    setVidCourseId(cId); setVidModuleId(mId); setVidSubId(sId); setEditingVideo(vid ?? null);
    setVideoForm(vid ? { title: vid.title, videoUrl: vid.videoUrl, duration: vid.duration } : dfVideo());
    setVideoUpload(vid?.videoUrl ? { url: vid.videoUrl } : null);
    setShowVideoModal(true);
  };
  const saveVideo = () => {
    if (!videoForm.title.trim()) return;
    const videoUrl = videoUpload?.url ?? videoForm.videoUrl;
    const duration = videoUpload?.duration ?? videoForm.duration;
    setCourses(cs => cs.map(c => c.id !== vidCourseId ? c : {
      ...c, modules: c.modules.map(m => m.id !== vidModuleId ? m : {
        ...m, submodules: m.submodules.map(s => {
          if (s.id !== vidSubId) return s;
          if (editingVideo) return { ...s, videos: s.videos.map(v => v.id === editingVideo.id ? { ...v, ...videoForm, videoUrl, duration } : v) };
          return { ...s, videos: [...s.videos, { id: uid(), submoduleId: vidSubId, orderIndex: s.videos.length, ...videoForm, videoUrl, duration }] };
        }),
      }),
    }));
    setShowVideoModal(false);
  };
  const deleteVideo = (cId: string, mId: string, sId: string, vId: string) => {
    if (confirm('Delete this video?'))
      setCourses(cs => cs.map(c => c.id !== cId ? c : { ...c, modules: c.modules.map(m => m.id !== mId ? m : { ...m, submodules: m.submodules.map(s => s.id !== sId ? s : { ...s, videos: s.videos.filter(v => v.id !== vId) }) }) }));
  };

  // ── Resource modal ────────────────────────────────────────────────────────
  const [showResModal, setShowResModal] = useState(false);
  const [resCourseId, setResCourseId] = useState('');
  const [resModuleId, setResModuleId] = useState('');
  const [resSubId, setResSubId] = useState('');
  const [editingRes, setEditingRes] = useState<Resource | null>(null);
  const [resTitle, setResTitle] = useState('');
  const [resUpload, setResUpload] = useState<UploadResult | null>(null);

  const openResModal = (cId: string, mId: string, sId: string, res?: Resource) => {
    setResCourseId(cId); setResModuleId(mId); setResSubId(sId); setEditingRes(res ?? null);
    setResTitle(res?.title ?? '');
    setResUpload(res?.fileUrl ? { url: res.fileUrl } : null);
    setShowResModal(true);
  };
  const saveRes = () => {
    if (!resTitle.trim() || !resUpload) return;
    const fileType = guessResourceType(resUpload.url, resUpload.file);
    setCourses(cs => cs.map(c => c.id !== resCourseId ? c : {
      ...c, modules: c.modules.map(m => m.id !== resModuleId ? m : {
        ...m, submodules: m.submodules.map(s => {
          if (s.id !== resSubId) return s;
          const r: Resource = { id: editingRes?.id ?? uid(), submoduleId: resSubId, title: resTitle.trim(), fileUrl: resUpload.url, fileType, fileSize: resUpload.fileSize, orderIndex: editingRes?.orderIndex ?? s.resources.length };
          if (editingRes) return { ...s, resources: s.resources.map(x => x.id === editingRes.id ? r : x) };
          return { ...s, resources: [...s.resources, r] };
        }),
      }),
    }));
    setShowResModal(false);
  };
  const deleteRes = (cId: string, mId: string, sId: string, rId: string) => {
    if (confirm('Delete this resource?'))
      setCourses(cs => cs.map(c => c.id !== cId ? c : { ...c, modules: c.modules.map(m => m.id !== mId ? m : { ...m, submodules: m.submodules.map(s => s.id !== sId ? s : { ...s, resources: s.resources.filter(r => r.id !== rId) }) }) }));
  };

  // ─── Derived stats ────────────────────────────────────────────────────────
  const totalModules = courses.reduce((a, c) => a + c.modules.length, 0);
  const totalSubs = courses.reduce((a, c) => a + c.modules.reduce((b, m) => b + m.submodules.length, 0), 0);
  const totalVideos = courses.reduce((a, c) => a + c.modules.reduce((b, m) => b + m.submodules.reduce((d, s) => d + s.videos.length, 0), 0), 0);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Course Management</h1>
          <p className="text-gray-500 text-sm">Build courses with modules, lessons, videos & downloadable resources</p>
        </div>
        <button onClick={() => openCourseModal()}
          className="text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold shadow-sm hover:opacity-90 transition"
          style={{ background: '#F5820A' }}>
          <Plus size={18} /> New Course
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Courses', value: courses.length, icon: <BookOpen size={16} />, color: '#F5820A' },
          { label: 'Modules', value: totalModules, icon: <List size={16} />, color: '#6366f1' },
          { label: 'Submodules', value: totalSubs, icon: <FileText size={16} />, color: '#0ea5e9' },
          { label: 'Videos', value: totalVideos, icon: <VideoIcon size={16} />, color: '#10b981' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm">
            <div className="p-2 rounded-lg" style={{ background: s.color + '18', color: s.color }}>{s.icon}</div>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Course list */}
      <div className="space-y-4">
        {courses.length === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No courses yet</p>
            <p className="text-sm text-gray-400 mt-1">Click "New Course" to get started</p>
          </div>
        )}

        {courses.map(course => {
          const cExp = expandedCourses.has(course.id);
          const subTotal = course.modules.reduce((a, m) => a + m.submodules.length, 0);
          const vidTotal = course.modules.reduce((a, m) => a + m.submodules.reduce((b, s) => b + s.videos.length, 0), 0);

          return (
            <div key={course.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Card */}
              <div className="flex flex-col sm:flex-row">
                <div className="w-full h-40 sm:w-52 sm:h-auto shrink-0">
                  <img src={course.thumbnail || 'https://via.placeholder.com/400x250?text=No+Thumbnail'} alt={course.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900">{course.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${course.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {course.status === 'published' ? <><CheckCircle2 size={10} /> Published</> : 'Draft'}
                        </span>
                        <DiffBadge d={course.difficulty} />
                      </div>
                      <p className="text-sm text-gray-500 mb-2 line-clamp-2">{course.description}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Tag size={11} /> {course.category}</span>
                        <span className="flex items-center gap-1"><User size={11} /> {course.instructor || 'No instructor'}</span>
                        <span className="flex items-center gap-1 font-semibold" style={{ color: '#F5820A' }}><DollarSign size={11} /> ₦{course.price.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><List size={11} /> {course.modules.length} modules</span>
                        <span className="flex items-center gap-1"><FileText size={11} /> {subTotal} submodules</span>
                        <span className="flex items-center gap-1"><VideoIcon size={11} /> {vidTotal} videos</span>
                      </div>
                      {course.whatYouLearn.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {course.whatYouLearn.slice(0, 3).map((w, i) => (
                            <span key={i} className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded">
                              <Star size={9} fill="currentColor" /> {w}
                            </span>
                          ))}
                          {course.whatYouLearn.length > 3 && (
                            <span className="text-xs text-gray-400">+{course.whatYouLearn.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openCourseModal(course)} className="p-2 hover:bg-gray-100 rounded-lg transition"><Edit size={15} className="text-gray-500" /></button>
                      <button onClick={() => deleteCourse(course.id)} className="p-2 hover:bg-red-50 rounded-lg transition"><Trash2 size={15} className="text-red-500" /></button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expand toggle */}
              <button
                onClick={() => setExpandedCourses(s => toggleSet(s, course.id))}
                className="w-full px-5 py-3 flex items-center justify-between border-t border-gray-100 hover:bg-gray-50 text-sm font-medium transition">
                <span className="flex items-center gap-2 text-gray-700"><List size={14} /> Manage Content — {course.modules.length} module{course.modules.length !== 1 ? 's' : ''}</span>
                <ChevronDown size={15} className={`text-gray-400 transition-transform ${cExp ? 'rotate-180' : ''}`} />
              </button>

              {/* ── Module tree ── */}
              {cExp && (
                <div className="border-t border-gray-100 bg-gray-50/60 p-5 space-y-3">
                  <button onClick={() => openModuleModal(course.id)}
                    className="text-sm font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-amber-400 hover:bg-amber-50 transition"
                    style={{ color: '#F5820A' }}>
                    <Plus size={14} /> Add Module
                  </button>
                  {course.modules.length === 0 && <p className="text-sm text-gray-400 italic">No modules yet.</p>}

                  {course.modules.map((mod, mi) => {
                    const mExp = expandedModules.has(mod.id);
                    return (
                      <div key={mod.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3">
                          <button className="flex items-center gap-2 flex-1 text-left" onClick={() => setExpandedModules(s => toggleSet(s, mod.id))}>
                            <GripVertical size={13} className="text-gray-300 shrink-0" />
                            {mExp ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronRight size={13} className="text-gray-400" />}
                            <span className="font-semibold text-sm text-gray-800">Module {mi + 1}: {mod.title}</span>
                            {mod.isFree ? <Badge green><Play size={9} /> Free</Badge> : <Badge><Lock size={9} /> Paid</Badge>}
                            <span className="text-xs text-gray-400">{mod.submodules.length} lesson{mod.submodules.length !== 1 ? 's' : ''}</span>
                          </button>
                          <div className="flex gap-1">
                            <button onClick={() => openModuleModal(course.id, mod)} className="p-1.5 hover:bg-gray-100 rounded-lg transition"><Edit size={13} className="text-gray-500" /></button>
                            <button onClick={() => deleteModule(course.id, mod.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition"><Trash2 size={13} className="text-red-400" /></button>
                          </div>
                        </div>
                        {mod.description && <p className="px-4 pb-2 text-xs text-gray-400 border-t border-gray-50 pt-1">{mod.description}</p>}

                        {/* ── Submodules ── */}
                        {mExp && (
                          <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
                            <button onClick={() => openSubModal(course.id, mod.id)}
                              className="text-xs font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-sky-400 text-sky-600 hover:bg-sky-50 transition">
                              <Plus size={11} /> Add Lesson
                            </button>
                            {mod.submodules.length === 0 && <p className="text-xs text-gray-400 italic">No lessons yet.</p>}

                            {mod.submodules.map((sub, si) => {
                              const sExp = expandedSubmodules.has(sub.id);
                              const vidCount = sub.videos.length;
                              const resCount = sub.resources.length;
                              return (
                                <div key={sub.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                  <div className="flex items-center justify-between px-3 py-2.5">
                                    <button className="flex items-center gap-2 flex-1 text-left" onClick={() => setExpandedSubmodules(s => toggleSet(s, sub.id))}>
                                      {sExp ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
                                      <span className="text-sm font-medium text-gray-700">{si + 1}. {sub.title}</span>
                                      <span className="text-xs text-gray-400">{vidCount} video{vidCount !== 1 ? 's' : ''}</span>
                                      {resCount > 0 && <span className="text-xs text-gray-400">{resCount} file{resCount !== 1 ? 's' : ''}</span>}
                                    </button>
                                    <div className="flex gap-1">
                                      <button onClick={() => openSubModal(course.id, mod.id, sub)} className="p-1 hover:bg-gray-100 rounded"><Edit size={12} className="text-gray-400" /></button>
                                      <button onClick={() => deleteSub(course.id, mod.id, sub.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 size={12} className="text-red-400" /></button>
                                    </div>
                                  </div>

                                  {/* ── Videos + Resources ── */}
                                  {sExp && (
                                    <div className="border-t border-gray-100 bg-gray-50/80 px-3 py-3 space-y-3">
                                      {sub.description && <p className="text-xs text-gray-400">{sub.description}</p>}

                                      {/* Videos section */}
                                      <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1"><VideoIcon size={11} /> Videos</p>
                                          <button onClick={() => openVideoModal(course.id, mod.id, sub.id)}
                                            className="text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold">
                                            <Plus size={11} /> Add Video
                                          </button>
                                        </div>
                                        {sub.videos.length === 0 && <p className="text-xs text-gray-400 italic">No videos yet.</p>}
                                        <div className="space-y-1">
                                          {sub.videos.map((vid, vi) => (
                                            <div key={vid.id} className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2">
                                              <VideoIcon size={12} className="text-emerald-500 shrink-0" />
                                              <span className="text-xs font-medium text-gray-700 flex-1 truncate">{vi + 1}. {vid.title}</span>
                                              {vid.duration > 0 && <span className="text-xs text-gray-400 shrink-0 font-mono">{fmtDuration(vid.duration)}</span>}
                                              {vid.videoUrl && (
                                                <a href={vid.videoUrl} target="_blank" rel="noreferrer" className="p-1 hover:bg-gray-100 rounded shrink-0">
                                                  <ExternalLink size={10} className="text-gray-400" />
                                                </a>
                                              )}
                                              <button onClick={() => openVideoModal(course.id, mod.id, sub.id, vid)} className="p-1 hover:bg-gray-100 rounded shrink-0"><Edit size={11} className="text-gray-400" /></button>
                                              <button onClick={() => deleteVideo(course.id, mod.id, sub.id, vid.id)} className="p-1 hover:bg-red-50 rounded shrink-0"><Trash2 size={11} className="text-red-400" /></button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Resources section */}
                                      <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1"><Paperclip size={11} /> Resources</p>
                                          <button onClick={() => openResModal(course.id, mod.id, sub.id)}
                                            className="text-xs flex items-center gap-1 text-violet-600 hover:text-violet-700 font-semibold">
                                            <Plus size={11} /> Add File
                                          </button>
                                        </div>
                                        {sub.resources.length === 0 && <p className="text-xs text-gray-400 italic">No resources yet.</p>}
                                        <div className="space-y-1">
                                          {sub.resources.map(res => (
                                            <div key={res.id} className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2">
                                              <ResIcon t={res.fileType} />
                                              <span className="text-xs font-medium text-gray-700 flex-1 truncate">{res.title}</span>
                                              {res.fileSize && <span className="text-xs text-gray-400 shrink-0">{(res.fileSize / 1024).toFixed(0)} KB</span>}
                                              <a href={res.fileUrl} download target="_blank" rel="noreferrer" className="p-1 hover:bg-gray-100 rounded shrink-0">
                                                <Download size={10} className="text-gray-400" />
                                              </a>
                                              <button onClick={() => openResModal(course.id, mod.id, sub.id, res)} className="p-1 hover:bg-gray-100 rounded shrink-0"><Edit size={11} className="text-gray-400" /></button>
                                              <button onClick={() => deleteRes(course.id, mod.id, sub.id, res.id)} className="p-1 hover:bg-red-50 rounded shrink-0"><Trash2 size={11} className="text-red-400" /></button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ════════════════════════════════════
          COURSE MODAL
      ════════════════════════════════════ */}
      {showCourseModal && (
        <Modal title={editingCourse ? 'Edit Course' : 'Create New Course'} onClose={() => setShowCourseModal(false)} onSave={saveCourse} saveLabel={editingCourse ? 'Save Changes' : 'Create Course'} wide>
          <FormField label="Course Title *">
            <input type="text" value={courseForm.title} onChange={e => setCourseForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="e.g., Make Your First ₦50k Online" />
          </FormField>

          <FormField label="Description *">
            <textarea value={courseForm.description} onChange={e => setCourseForm(f => ({ ...f, description: e.target.value }))} className={inputCls} rows={3} placeholder="What will students learn?" />
          </FormField>

          {/* Thumbnail upload */}
          <FileUpload
            type="image"
            label="Course Thumbnail"
            value={courseForm.thumbnail}
            hint="Recommended: 1280×720px (16:9). JPG, PNG or WebP."
            onChange={r => { setThumbnailUpload(r); setCourseForm(f => ({ ...f, thumbnail: r?.url ?? '' })); }}
          />

          {/* Preview video upload */}
          <FileUpload
            type="video"
            label="Preview / Intro Video (optional)"
            value={courseForm.previewVideoUrl}
            hint="This video is shown to non-enrolled users as a teaser."
            onChange={r => { setPreviewUpload(r); setCourseForm(f => ({ ...f, previewVideoUrl: r?.url ?? '' })); }}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Price (₦)">
              <input type="number" min={0} value={courseForm.price} onChange={e => setCourseForm(f => ({ ...f, price: Number(e.target.value) }))} className={inputCls} />
            </FormField>
            <FormField label="Status">
              <select value={courseForm.status} onChange={e => setCourseForm(f => ({ ...f, status: e.target.value as Course['status'] }))} className={selectCls}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category">
              <select value={courseForm.category} onChange={e => setCourseForm(f => ({ ...f, category: e.target.value as CourseCategory }))} className={selectCls}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="Difficulty">
              <select value={courseForm.difficulty} onChange={e => setCourseForm(f => ({ ...f, difficulty: e.target.value as CourseDifficulty }))} className={selectCls}>
                {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
              </select>
            </FormField>
          </div>

          <FormField label="Instructor Name">
            <input type="text" value={courseForm.instructor} onChange={e => setCourseForm(f => ({ ...f, instructor: e.target.value }))} className={inputCls} placeholder="e.g., Selliberation Team" />
          </FormField>

          <FormField label="What You'll Learn">
            <div className="space-y-2">
              {courseForm.whatYouLearn.map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  <Star size={11} className="text-amber-400 shrink-0" fill="currentColor" />
                  <span className="text-sm text-gray-700 flex-1">{item}</span>
                  <button onClick={() => removeWyl(i)} className="p-0.5 hover:text-red-500 transition"><X size={13} /></button>
                </div>
              ))}
              <div className="flex gap-2">
                <input type="text" value={wylInput} onChange={e => setWylInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addWyl()}
                  className={inputCls} placeholder="Type a learning outcome and press Enter…" />
                <button onClick={addWyl} className="px-3 py-2 rounded-xl text-white text-sm font-semibold shrink-0" style={{ background: '#F5820A' }}><Plus size={15} /></button>
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-1"><AlertCircle size={10} /> Press Enter or click + to add items</p>
            </div>
          </FormField>
        </Modal>
      )}

      {/* ════════════════════════════════════
          MODULE MODAL
      ════════════════════════════════════ */}
      {showModuleModal && (
        <Modal title={editingModule ? 'Edit Module' : 'Add Module'} onClose={() => setShowModuleModal(false)} onSave={saveModule} saveLabel={editingModule ? 'Save Changes' : 'Add Module'}>
          <FormField label="Module Title *">
            <input type="text" value={moduleForm.title} onChange={e => setModuleForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="e.g., Introduction to the Course" />
          </FormField>
          <FormField label="Description">
            <textarea value={moduleForm.description} onChange={e => setModuleForm(f => ({ ...f, description: e.target.value }))} className={inputCls} rows={2} placeholder="Brief description of this module…" />
          </FormField>
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
            <input type="checkbox" checked={moduleForm.isFree} onChange={e => setModuleForm(f => ({ ...f, isFree: e.target.checked }))} className="w-4 h-4 rounded accent-amber-500" />
            <div>
              <p className="text-sm font-medium text-gray-800">Free Module</p>
              <p className="text-xs text-gray-400">Available to trial users without a paid subscription</p>
            </div>
          </label>
        </Modal>
      )}

      {/* ════════════════════════════════════
          SUBMODULE MODAL
      ════════════════════════════════════ */}
      {showSubModal && (
        <Modal title={editingSub ? 'Edit Lesson' : 'Add Lesson'} onClose={() => setShowSubModal(false)} onSave={saveSub} saveLabel={editingSub ? 'Save Changes' : 'Add Lesson'}>
          <FormField label="Lesson Title *">
            <input type="text" value={subForm.title} onChange={e => setSubForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="e.g., What is Online Income?" />
          </FormField>
          <FormField label="Description">
            <textarea value={subForm.description} onChange={e => setSubForm(f => ({ ...f, description: e.target.value }))} className={inputCls} rows={3} placeholder="What does this lesson cover?" />
          </FormField>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-600">
            💡 After creating the lesson, expand it in the course tree to add videos and downloadable resources.
          </div>
        </Modal>
      )}

      {/* ════════════════════════════════════
          VIDEO MODAL
      ════════════════════════════════════ */}
      {showVideoModal && (
        <Modal title={editingVideo ? 'Edit Video' : 'Add Video'} onClose={() => setShowVideoModal(false)} onSave={saveVideo} saveLabel={editingVideo ? 'Save Changes' : 'Add Video'} wide>
          <FormField label="Video Title *">
            <input type="text" value={videoForm.title} onChange={e => setVideoForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="e.g., Introduction to the Course" />
          </FormField>

          <FileUpload
            type="video"
            label="Video File or URL"
            value={editingVideo?.videoUrl}
            hint="Upload directly (MP4 recommended) or paste a YouTube / Vimeo link. Duration is auto-detected for uploaded files."
            onChange={r => {
              setVideoUpload(r);
              setVideoForm(f => ({ ...f, videoUrl: r?.url ?? '', duration: r?.duration ?? f.duration }));
            }}
          />

          <FormField label="Duration (seconds) — auto-detected for uploaded files">
            <div className="flex items-center gap-2">
              <input type="number" min={0} value={videoForm.duration}
                onChange={e => setVideoForm(f => ({ ...f, duration: Number(e.target.value) }))}
                className={inputCls} placeholder="e.g., 300 for 5:00" />
              {videoForm.duration > 0 && (
                <span className="text-sm text-gray-500 font-mono shrink-0 bg-gray-100 px-3 py-2 rounded-xl">= {fmtDuration(videoForm.duration)}</span>
              )}
            </div>
          </FormField>
        </Modal>
      )}

      {/* ════════════════════════════════════
          RESOURCE MODAL
      ════════════════════════════════════ */}
      {showResModal && (
        <Modal title={editingRes ? 'Edit Resource' : 'Add Resource'} onClose={() => setShowResModal(false)} onSave={saveRes} saveLabel={editingRes ? 'Save Changes' : 'Add Resource'} wide>
          <FormField label="Resource Title *">
            <input type="text" value={resTitle} onChange={e => setResTitle(e.target.value)} className={inputCls} placeholder="e.g., Week 1 Worksheet.pdf" />
          </FormField>

          <FileUpload
            type="document"
            label="File or URL *"
            value={editingRes?.fileUrl}
            hint="Upload a PDF, Word document, or any file. Or paste a Google Drive / Dropbox link."
            onChange={r => setResUpload(r)}
          />

          {!resUpload && (
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 text-xs text-violet-600">
              💡 Students will see a download button for this resource inside the lesson.
            </div>
          )}
        </Modal>
      )}

    </div>
  );
}
