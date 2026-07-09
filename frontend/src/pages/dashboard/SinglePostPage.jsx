import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { FiArrowLeft, FiFileText } from "react-icons/fi";

import PostCard from "../../components/feed/PostCard";

import { getPostById } from "../../services/feedService";

const SinglePostPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const targetComment = new URLSearchParams(location.search).get("comment");
  const [post, setPost] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await getPostById(id);

        setPost(res.post);
      } catch (err) {
        console.log(err);

        if (err.response?.status === 404) {
          navigate("/dashboard/feed");

          return;
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id, navigate]);

  if (loading) {
    return (
      <main className="feed-page single-post-page">
        <section className="feed-content single-post-content">
          <div className="feed-skeleton feed-skeleton-card" />
        </section>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="feed-page single-post-page">
        <section className="feed-content single-post-content">
          <div className="feed-state-card">
            <FiFileText />
            <h2>Post not found</h2>
            <p>This post may have been deleted or is no longer available.</p>
            <button
              className="cc-button cc-button-secondary"
              onClick={() => navigate("/dashboard/feed")}
              type="button"
            >
              <FiArrowLeft />
              Back to feed
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="feed-page single-post-page">
      <section className="feed-content single-post-content">
        <button
          className="single-post-back"
          onClick={() => navigate("/dashboard/feed")}
          type="button"
        >
          <FiArrowLeft />
          Back to feed
        </button>

        <PostCard
          post={post}
          forceShowComments={true}
          targetComment={targetComment}
        />
      </section>
    </main>
  );
};

export default SinglePostPage;
