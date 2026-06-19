import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ArrowLeft, ThumbsUp, ThumbsDown, MessageSquare, Trash2, Send, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "../lib/supabase";

interface Props {
  username:      string;
  displayName:   string;
  onBack:        () => void;
  onViewProfile: (username: string) => void;
}

interface Review {
  id: string;
  username: string;
  display_name: string;
  rating: number;
  created_at: string;
}

interface Comment {
  id: string;
  username: string;
  display_name: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  likes: number;
  dislikes: number;
  myVote: "like" | "dislike" | null;
  replies?: Comment[];
  showReplies?: boolean;
}

function fmtTs(ts: string): string {
  const d = new Date(ts);
  const dd   = String(d.getDate()).padStart(2, "0");
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh   = String(d.getHours()).padStart(2, "0");
  const min  = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

function StarRating({ value, onChange, size = 28 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange?.(i)}
          onMouseEnter={() => onChange && setHovered(i)}
          className={onChange ? "cursor-pointer transition-transform hover:scale-110" : "cursor-default"}
          style={{ padding: 2 }}
          disabled={!onChange}
        >
          <Star
            size={size}
            fill={i <= display ? "#facc15" : "none"}
            className={i <= display ? "text-[#facc15]" : "text-white/20"}
            style={{ filter: i <= display ? "drop-shadow(0 0 4px rgba(250,204,21,0.6))" : "none" }}
          />
        </button>
      ))}
    </div>
  );
}

function Avatar({ username, displayName, size = 36, onClick }: { username: string; displayName: string; size?: number; onClick: () => void }) {
  const initial = (displayName || username).charAt(0).toUpperCase();
  const colors  = ["#4af", "#a78bfa", "#4ade80", "#f97316", "#f43f5e", "#facc15"];
  const color   = colors[username.charCodeAt(0) % colors.length];
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 rounded-full flex items-center justify-center font-black transition-all hover:scale-110 hover:opacity-90"
      style={{ width: size, height: size, background: `${color}22`, border: `2px solid ${color}55`, color, fontSize: size * 0.42 }}
      title={displayName}
    >
      {initial}
    </button>
  );
}

export default function ReviewPage({ username, displayName, onBack, onViewProfile }: Props) {
  const [reviews,        setReviews]       = useState<Review[]>([]);
  const [comments,       setComments]      = useState<Comment[]>([]);
  const [myRating,       setMyRating]      = useState(0);
  const [pendingRating,  setPendingRating] = useState(0);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [loadingComments,setLoadingComments] = useState(true);
  const [commentText,    setCommentText]   = useState("");
  const [replyTo,        setReplyTo]       = useState<{ id: string; displayName: string } | null>(null);
  const [replyText,      setReplyText]     = useState("");
  const [submitting,     setSubmitting]    = useState(false);
  const [ratingDone,     setRatingDone]    = useState(false);
  const replyInputRef = useRef<HTMLInputElement>(null);

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;

  const loadReviews = useCallback(async () => {
    setLoadingReviews(true);
    const { data } = await supabase.from("game_reviews").select("*");
    if (data) {
      setReviews(data);
      const mine = data.find(r => r.username === username);
      if (mine) { setMyRating(mine.rating); setPendingRating(mine.rating); }
    }
    setLoadingReviews(false);
  }, [username]);

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    const { data: cmts } = await supabase
      .from("game_comments")
      .select("*")
      .is("parent_id", null)
      .order("created_at", { ascending: false });

    const { data: replies } = await supabase
      .from("game_comments")
      .select("*")
      .not("parent_id", "is", null)
      .order("created_at", { ascending: true });

    const { data: votes } = await supabase
      .from("comment_votes")
      .select("*");

    const voteMap: Record<string, { likes: number; dislikes: number; myVote: "like" | "dislike" | null }> = {};
    for (const v of (votes ?? [])) {
      if (!voteMap[v.comment_id]) voteMap[v.comment_id] = { likes: 0, dislikes: 0, myVote: null };
      if (v.vote_type === "like") voteMap[v.comment_id].likes++;
      else voteMap[v.comment_id].dislikes++;
      if (v.username === username) voteMap[v.comment_id].myVote = v.vote_type;
    }

    const mapComment = (c: Record<string, unknown>): Comment => ({
      id: c.id as string,
      username: c.username as string,
      display_name: c.display_name as string,
      content: c.content as string,
      parent_id: c.parent_id as string | null,
      created_at: c.created_at as string,
      likes:    voteMap[c.id as string]?.likes    ?? 0,
      dislikes: voteMap[c.id as string]?.dislikes ?? 0,
      myVote:   voteMap[c.id as string]?.myVote   ?? null,
    });

    const replyList = (replies ?? []).map(mapComment);
    const commentList = (cmts ?? []).map(c => ({
      ...mapComment(c),
      replies: replyList.filter(r => r.parent_id === c.id),
      showReplies: false,
    }));

    setComments(commentList);
    setLoadingComments(false);
  }, [username]);

  useEffect(() => { loadReviews(); loadComments(); }, [loadReviews, loadComments]);

  useEffect(() => {
    if (replyTo && replyInputRef.current) replyInputRef.current.focus();
  }, [replyTo]);

  const handleRatingSelect = async (rating: number) => {
    setPendingRating(rating);
    setRatingDone(false);
    const existing = reviews.find(r => r.username === username);
    if (existing) {
      await supabase.from("game_reviews").update({ rating, updated_at: new Date().toISOString() }).eq("username", username);
    } else {
      await supabase.from("game_reviews").insert({ username, display_name: displayName, rating });
    }
    setMyRating(rating);
    setRatingDone(true);
    await loadReviews();
    setTimeout(() => setRatingDone(false), 2500);
  };

  const handleVote = async (commentId: string, vote: "like" | "dislike") => {
    if (!username) return;
    const comment = comments.find(c => c.id === commentId) ??
                    comments.flatMap(c => c.replies ?? []).find(r => r.id === commentId);
    if (!comment) return;

    if (comment.myVote === vote) {
      await supabase.from("comment_votes").delete().eq("comment_id", commentId).eq("username", username);
    } else if (comment.myVote) {
      await supabase.from("comment_votes").update({ vote_type: vote }).eq("comment_id", commentId).eq("username", username);
    } else {
      await supabase.from("comment_votes").insert({ comment_id: commentId, username, vote_type: vote });
    }
    await loadComments();
  };

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from("game_comments").delete().eq("id", commentId).eq("username", username);
    await loadComments();
  };

  const handlePostComment = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    await supabase.from("game_comments").insert({ username, display_name: displayName, content: commentText.trim(), parent_id: null });
    setCommentText("");
    await loadComments();
    setSubmitting(false);
  };

  const handlePostReply = async () => {
    if (!replyText.trim() || !replyTo || submitting) return;
    setSubmitting(true);
    await supabase.from("game_comments").insert({ username, display_name: displayName, content: replyText.trim(), parent_id: replyTo.id });
    setReplyText("");
    setReplyTo(null);
    await loadComments();
    setSubmitting(false);
  };

  const toggleReplies = (commentId: string) => {
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, showReplies: !c.showReplies } : c));
  };

  const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
  }));

  return (
    <div className="novaball-screen min-h-[100dvh] bg-[#070d16] overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* ── Başlık ── */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-all hover:bg-white/10 text-white/60 hover:text-white flex-shrink-0"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-white font-black text-xl leading-tight">Yorum Yap & Değerlendir</h1>
            <p className="text-white/40 text-xs mt-0.5">NovaBall hakkındaki düşünceni paylaş</p>
          </div>
        </div>

        {/* ── Puan özeti ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 space-y-4"
          style={{
            background: "linear-gradient(135deg,rgba(15,25,52,0.95),rgba(8,14,26,0.95))",
            border: "1px solid rgba(250,204,21,0.18)",
            boxShadow: "0 4px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04) inset",
          }}
        >
          <div className="flex items-start gap-6">
            {/* Büyük skor */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              {loadingReviews ? (
                <div className="w-16 h-10 bg-white/5 rounded-lg animate-pulse" />
              ) : (
                <span className="text-white font-black text-5xl leading-none"
                  style={{ textShadow: "0 0 32px rgba(250,204,21,0.4)" }}>
                  {avgRating > 0 ? avgRating.toFixed(1) : "—"}
                </span>
              )}
              <StarRating value={Math.round(avgRating)} size={14} />
              <span className="text-white/40 text-[11px] font-semibold mt-0.5">
                {reviews.length > 0 ? `${reviews.length} değerlendirme` : "Henüz değerlendirme yok"}
              </span>
            </div>

            {/* Bar chart */}
            <div className="flex-1 space-y-1.5">
              {ratingCounts.map(({ star, count }) => {
                const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-white/50 text-[11px] font-bold w-3 text-right">{star}</span>
                    <Star size={9} fill="#facc15" className="text-[#facc15] flex-shrink-0" />
                    <div className="flex-1 h-1.5 rounded-full bg-white/6 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: 0.2 }}
                        className="h-full rounded-full"
                        style={{ background: "linear-gradient(90deg,#ca8a04,#facc15)" }}
                      />
                    </div>
                    <span className="text-white/30 text-[10px] font-semibold w-4 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Benim puanım */}
          {username && (
            <div className="pt-3 border-t border-white/8">
              <p className="text-white/50 text-xs font-semibold mb-2">Senin puanın</p>
              <div className="flex items-center gap-3">
                <StarRating value={pendingRating} onChange={handleRatingSelect} size={26} />
                <AnimatePresence>
                  {ratingDone && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      className="text-[#4ade80] text-xs font-bold"
                    >
                      Kaydedildi ✓
                    </motion.span>
                  )}
                </AnimatePresence>
                {myRating > 0 && !ratingDone && (
                  <span className="text-white/30 text-xs">Güncelle</span>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Yorum yaz ── */}
        {username && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl p-4 space-y-3"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Yorum yaz</p>
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Deneyimini paylaş…"
              maxLength={1000}
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none resize-none transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              onFocus={e => { e.currentTarget.style.borderColor = "rgba(68,170,255,0.4)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
            />
            <div className="flex items-center justify-between">
              <span className="text-white/25 text-xs">{commentText.length}/1000</span>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handlePostComment}
                disabled={!commentText.trim() || submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#1a5f8a,#4af)", border: "1px solid rgba(68,170,255,0.3)" }}
              >
                <Send size={13} />
                Gönder
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── Yorumlar listesi ── */}
        <div className="space-y-3">
          <p className="text-white/50 text-xs font-bold uppercase tracking-wider px-1">
            Yorumlar {comments.length > 0 && <span className="text-white/30 normal-case font-semibold">({comments.length})</span>}
          </p>

          {loadingComments ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/10 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-white/10 rounded w-1/3" />
                      <div className="h-4 bg-white/6 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 text-white/25 text-sm">
              <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
              <p>Henüz yorum yok. İlk yorumu sen yaz!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment, idx) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <CommentCard
                    comment={comment}
                    currentUsername={username}
                    onVote={handleVote}
                    onDelete={handleDeleteComment}
                    onReply={() => { setReplyTo({ id: comment.id, displayName: comment.display_name }); }}
                    onViewProfile={onViewProfile}
                  />

                  {/* Yanıtları göster/gizle */}
                  {(comment.replies?.length ?? 0) > 0 && (
                    <div className="ml-11 mt-1">
                      <button
                        onClick={() => toggleReplies(comment.id)}
                        className="flex items-center gap-1.5 text-[#4af]/70 text-xs font-semibold hover:text-[#4af] transition-colors py-1"
                      >
                        {comment.showReplies
                          ? <><ChevronUp size={13} /> Yanıtları gizle</>
                          : <><ChevronDown size={13} /> {comment.replies!.length} yanıt</>
                        }
                      </button>

                      <AnimatePresence>
                        {comment.showReplies && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-2 mt-1"
                          >
                            {comment.replies!.map(reply => (
                              <CommentCard
                                key={reply.id}
                                comment={reply}
                                currentUsername={username}
                                onVote={handleVote}
                                onDelete={handleDeleteComment}
                                onReply={null}
                                onViewProfile={onViewProfile}
                                isReply
                              />
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Yanıt kutusu */}
                  <AnimatePresence>
                    {replyTo?.id === comment.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="ml-11 mt-2"
                      >
                        <div className="flex gap-2">
                          <input
                            ref={replyInputRef}
                            type="text"
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handlePostReply()}
                            placeholder={`@${replyTo.displayName} kişisine yanıtla…`}
                            maxLength={500}
                            className="flex-1 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 outline-none transition-all"
                            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(68,170,255,0.3)" }}
                          />
                          <button
                            onClick={handlePostReply}
                            disabled={!replyText.trim() || submitting}
                            className="px-3 py-2 rounded-xl text-[#4af] transition-all hover:bg-[#4af]/15 disabled:opacity-40"
                            style={{ border: "1px solid rgba(68,170,255,0.25)" }}
                          >
                            <Send size={12} />
                          </button>
                          <button
                            onClick={() => { setReplyTo(null); setReplyText(""); }}
                            className="px-2 py-2 rounded-xl text-white/40 hover:text-white/70 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentCard({
  comment, currentUsername, onVote, onDelete, onReply, onViewProfile, isReply = false,
}: {
  comment: Comment;
  currentUsername: string;
  onVote: (id: string, vote: "like" | "dislike") => void;
  onDelete: (id: string) => void;
  onReply: (() => void) | null;
  onViewProfile: (username: string) => void;
  isReply?: boolean;
}) {
  const isOwn = comment.username === currentUsername;

  return (
    <div
      className="flex gap-3 rounded-2xl p-3.5 transition-all"
      style={{
        background: isReply ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${isOwn ? "rgba(68,170,255,0.18)" : "rgba(255,255,255,0.07)"}`,
      }}
    >
      <Avatar
        username={comment.username}
        displayName={comment.display_name}
        size={isReply ? 30 : 36}
        onClick={() => onViewProfile(comment.username)}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <button
            onClick={() => onViewProfile(comment.username)}
            className="font-bold text-sm text-white/90 hover:text-white transition-colors truncate"
          >
            {comment.display_name}
            {isOwn && <span className="ml-1.5 text-[10px] text-[#4af]/70 font-semibold normal-case">(sen)</span>}
          </button>
          <span className="text-white/25 text-[10px] font-semibold flex-shrink-0">{fmtTs(comment.created_at)}</span>
        </div>

        <p className="text-white/70 text-[13px] leading-relaxed break-words">{comment.content}</p>

        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => onVote(comment.id, "like")}
            className={`flex items-center gap-1 text-xs font-semibold transition-all rounded-lg px-2 py-1 ${
              comment.myVote === "like"
                ? "text-[#4ade80] bg-[#4ade80]/15"
                : "text-white/35 hover:text-[#4ade80] hover:bg-[#4ade80]/10"
            }`}
          >
            <ThumbsUp size={11} fill={comment.myVote === "like" ? "#4ade80" : "none"} />
            {comment.likes > 0 && comment.likes}
          </button>
          <button
            onClick={() => onVote(comment.id, "dislike")}
            className={`flex items-center gap-1 text-xs font-semibold transition-all rounded-lg px-2 py-1 ${
              comment.myVote === "dislike"
                ? "text-[#f87171] bg-[#f87171]/15"
                : "text-white/35 hover:text-[#f87171] hover:bg-[#f87171]/10"
            }`}
          >
            <ThumbsDown size={11} fill={comment.myVote === "dislike" ? "#f87171" : "none"} />
            {comment.dislikes > 0 && comment.dislikes}
          </button>
          {onReply && (
            <button
              onClick={onReply}
              className="flex items-center gap-1 text-xs font-semibold text-white/30 hover:text-[#4af] transition-colors rounded-lg px-2 py-1 hover:bg-[#4af]/10"
            >
              <MessageSquare size={11} />
              Yanıtla
            </button>
          )}
          {isOwn && (
            <button
              onClick={() => onDelete(comment.id)}
              className="flex items-center gap-1 text-xs font-semibold text-white/20 hover:text-[#f87171] transition-colors rounded-lg px-2 py-1 hover:bg-[#f87171]/10 ml-auto"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
