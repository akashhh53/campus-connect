import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router";
import { useNavigate } from "react-router";

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
  }, [id]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!post) {
    return <div>Post not found</div>;
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <PostCard
        post={post}
        forceShowComments={true}
        targetComment={targetComment}
      />
    </div>
  );
};

export default SinglePostPage;
