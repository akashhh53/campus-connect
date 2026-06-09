import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useSelector } from "react-redux";
import {
  getUserDetails,
  getUserPosts,
  getFollowers,
  getFollowing,
} from "../../services/userService";
import { followUser, unfollowUser } from "../../services/followService";
import PostCard from "../../components/feed/PostCard";

const UserProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.auth.user);

  const [user, setUser] = useState(null);

  // Post pagination states
  const [posts, setPosts] = useState([]);
  const [postsPage, setPostsPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [totalPosts, setTotalPosts] = useState(0);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);

  // Followers pagination states
  const [followersList, setFollowersList] = useState([]);
  const [followersPage, setFollowersPage] = useState(1);
  const [hasMoreFollowers, setHasMoreFollowers] = useState(true);
  const [totalFollowers, setTotalFollowers] = useState(0);
  const [loadingMoreFollowers, setLoadingMoreFollowers] = useState(false);

  // Following pagination states
  const [followingList, setFollowingList] = useState([]);
  const [followingPage, setFollowingPage] = useState(1);
  const [hasMoreFollowing, setHasMoreFollowing] = useState(true);
  const [totalFollowing, setTotalFollowing] = useState(0);
  const [loadingMoreFollowing, setLoadingMoreFollowing] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [isHoveringFollow, setIsHoveringFollow] = useState(false);
  const [followersSearch, setFollowersSearch] = useState("");
  const [followingSearch, setFollowingSearch] = useState("");
  const [modalFollowing, setModalFollowing] = useState({});

  // Refs for infinite scroll
  const postsObserverRef = useRef();
  const followersObserverRef = useRef();
  const followingObserverRef = useRef();
  const lastPostRef = useRef();
  const lastFollowerRef = useRef();
  const lastFollowingRef = useRef();

  const isOwnProfile = currentUser?._id === id;

  // Filtered lists based on search
  const filteredFollowers = followersList.filter((item) =>
    (item?.follower?.name || item?.name || "")
      .toLowerCase()
      .includes(followersSearch.toLowerCase()),
  );

  const filteredFollowing = followingList.filter((item) =>
    (item?.following?.name || item?.name || "")
      .toLowerCase()
      .includes(followingSearch.toLowerCase()),
  );

  // Fetch posts with pagination
  const fetchUserPosts = useCallback(
    async (page = 1, append = false) => {
      try {
        if (page === 1) {
          setLoadingPosts(true);
        } else {
          setLoadingMorePosts(true);
        }

        const postData = await getUserPosts(id, page, 10);
        const newPosts = postData.posts || [];
        const pagination = postData.pagination || {};

        setPosts((prev) => (append ? [...prev, ...newPosts] : newPosts));
        setHasMorePosts(pagination.hasNext || false);
        setTotalPosts(pagination.total || newPosts.length);
        setPostsPage(page);
      } catch (error) {
        console.error("Failed to fetch user posts:", error);
      } finally {
        setLoadingPosts(false);
        setLoadingMorePosts(false);
      }
    },
    [id],
  );

  // Fetch followers with pagination
  const fetchUserFollowers = useCallback(
    async (page = 1, append = false) => {
      try {
        if (page === 1) {
          setLoadingMoreFollowers(false);
        } else {
          setLoadingMoreFollowers(true);
        }

        const followersData = await getFollowers(id, page, 20);
        const newFollowers = followersData.followers || [];
        const pagination = followersData.pagination || {};

        setFollowersList((prev) =>
          append ? [...prev, ...newFollowers] : newFollowers,
        );
        setHasMoreFollowers(pagination.hasNext || false);
        setTotalFollowers(pagination.total || newFollowers.length);
        setFollowersPage(page);
      } catch (error) {
        console.error("Failed to fetch followers:", error);
      } finally {
        setLoadingMoreFollowers(false);
      }
    },
    [id],
  );

  // Fetch following with pagination
  const fetchUserFollowing = useCallback(
    async (page = 1, append = false) => {
      try {
        if (page === 1) {
          setLoadingMoreFollowing(false);
        } else {
          setLoadingMoreFollowing(true);
        }

        const followingData = await getFollowing(id, page, 20);
        const newFollowing = followingData.following || [];
        const pagination = followingData.pagination || {};

        setFollowingList((prev) =>
          append ? [...prev, ...newFollowing] : newFollowing,
        );
        setHasMoreFollowing(pagination.hasNext || false);
        setTotalFollowing(pagination.total || newFollowing.length);
        setFollowingPage(page);

        // Update following status for new items
        const followingStatus = { ...modalFollowing };
        newFollowing.forEach((item) => {
          const userId = item?.following?._id || item?._id;
          if (userId) {
            followingStatus[userId] = true;
          }
        });
        setModalFollowing(followingStatus);
      } catch (error) {
        console.error("Failed to fetch following:", error);
      } finally {
        setLoadingMoreFollowing(false);
      }
    },
    [id, modalFollowing],
  );

  // Infinite scroll observer for posts
  const lastPostElementRef = useCallback(
    (node) => {
      if (loadingPosts || loadingMorePosts) return;
      if (postsObserverRef.current) postsObserverRef.current.disconnect();

      postsObserverRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMorePosts) {
            fetchUserPosts(postsPage + 1, true);
          }
        },
        { threshold: 0.1, rootMargin: "100px" },
      );

      if (node) postsObserverRef.current.observe(node);
    },
    [loadingPosts, loadingMorePosts, hasMorePosts, postsPage, fetchUserPosts],
  );

  // Infinite scroll observer for followers
  const lastFollowerElementRef = useCallback(
    (node) => {
      if (loadingMoreFollowers) return;
      if (followersObserverRef.current)
        followersObserverRef.current.disconnect();

      followersObserverRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMoreFollowers) {
            fetchUserFollowers(followersPage + 1, true);
          }
        },
        { threshold: 0.1, rootMargin: "100px" },
      );

      if (node) followersObserverRef.current.observe(node);
    },
    [loadingMoreFollowers, hasMoreFollowers, followersPage, fetchUserFollowers],
  );

  // Infinite scroll observer for following
  const lastFollowingElementRef = useCallback(
    (node) => {
      if (loadingMoreFollowing) return;
      if (followingObserverRef.current)
        followingObserverRef.current.disconnect();

      followingObserverRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMoreFollowing) {
            fetchUserFollowing(followingPage + 1, true);
          }
        },
        { threshold: 0.1, rootMargin: "100px" },
      );

      if (node) followingObserverRef.current.observe(node);
    },
    [loadingMoreFollowing, hasMoreFollowing, followingPage, fetchUserFollowing],
  );

  // Fetch all user data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [userData, followersData, followingData] = await Promise.all([
          getUserDetails(id),
          getFollowers(id, 1, 20),
          getFollowing(id, 1, 20),
        ]);

        setUser(userData.user || userData.data || userData);

        setFollowersList(followersData.followers || []);
        setTotalFollowers(
          followersData.pagination?.total ||
            followersData.followers?.length ||
            0,
        );
        setHasMoreFollowers(followersData.pagination?.hasNext || false);
        setFollowersPage(1);

        setFollowingList(followingData.following || []);
        setTotalFollowing(
          followingData.pagination?.total ||
            followingData.following?.length ||
            0,
        );
        setHasMoreFollowing(followingData.pagination?.hasNext || false);
        setFollowingPage(1);

        const followingStatus = {};
        followingData.following?.forEach((item) => {
          const userId = item?.following?._id || item?._id;
          if (userId) {
            followingStatus[userId] = true;
          }
        });
        setModalFollowing(followingStatus);

        if (!isOwnProfile && currentUser?._id) {
          const isUserFollowing = followersData?.followers?.some(
            (item) => item?.follower?._id === currentUser._id,
          );
          setIsFollowing(isUserFollowing);
        }
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
      fetchUserPosts(1, false);
    }
  }, [id, isOwnProfile, currentUser?._id, fetchUserPosts]);

  const handleFollow = async () => {
    if (followLoading || isOwnProfile) return;
    setFollowLoading(true);
    const wasFollowing = isFollowing;

    try {
      if (wasFollowing) {
        await unfollowUser(id);
        setIsFollowing(false);
        setTotalFollowers((prev) => Math.max(0, prev - 1));
      } else {
        await followUser(id);
        setIsFollowing(true);
        setTotalFollowers((prev) => prev + 1);
      }
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Failed");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleModalFollow = async (targetUserId) => {
    if (!targetUserId) return;
    const currentlyFollowing = modalFollowing[targetUserId];

    try {
      if (currentlyFollowing) {
        await unfollowUser(targetUserId);
        setTotalFollowing((prev) => Math.max(0, prev - 1));
        setModalFollowing((prev) => ({ ...prev, [targetUserId]: false }));
      } else {
        await followUser(targetUserId);
        setTotalFollowing((prev) => prev + 1);
        setModalFollowing((prev) => ({ ...prev, [targetUserId]: true }));
      }
    } catch (error) {
      console.log(error);
      alert(error?.response?.data?.message || "Failed");
    }
  };

  const handleViewFollowers = () => {
    setFollowersSearch("");
    setShowFollowersModal(true);
  };

  const handleViewFollowing = () => {
    setFollowingSearch("");
    setShowFollowingModal(true);
  };

  const handleUserClick = (userId) => {
    if (userId === currentUser?._id) {
      navigate("/dashboard/profile");
    } else {
      navigate(`/dashboard/user/${userId}`);
    }
    setShowFollowersModal(false);
    setShowFollowingModal(false);
  };

  const handleCloseFollowersModal = async () => {
    setShowFollowersModal(false);
    const followersData = await getFollowers(id, 1, 20);
    setFollowersList(followersData.followers || []);
    setTotalFollowers(
      followersData.pagination?.total || followersData.followers?.length || 0,
    );
    setHasMoreFollowers(followersData.pagination?.hasNext || false);
    setFollowersPage(1);
  };

  const handleCloseFollowingModal = async () => {
    setShowFollowingModal(false);
    const followingData = await getFollowing(id, 1, 20);
    setFollowingList(followingData.following || []);
    setTotalFollowing(
      followingData.pagination?.total || followingData.following?.length || 0,
    );
    setHasMoreFollowing(followingData.pagination?.hasNext || false);
    setFollowingPage(1);

    const followingStatus = {};
    followingData.following?.forEach((item) => {
      const userId = item?.following?._id || item?._id;
      if (userId) {
        followingStatus[userId] = true;
      }
    });
    setModalFollowing(followingStatus);
  };

  // SKELETON LOADING STATE
  if (loading) {
    return (
      <div className="profile-page" style={styles.page}>
        <div style={styles.skeletonCover}></div>
        <div style={styles.skeletonProfileContainer}>
          <div style={styles.skeletonAvatar}></div>
          <div style={styles.profileInfo}>
            <div style={styles.profileNameSection}>
              <div style={styles.skeletonName}></div>
              <div style={styles.skeletonButton}></div>
            </div>
            <div style={styles.skeletonEmail}></div>
            <div style={styles.skeletonBio}></div>
            <div style={styles.profileStats}>
              <div style={styles.statItem}>
                <div style={styles.skeletonStatNumber}></div>
                <div style={styles.skeletonStatLabel}></div>
              </div>
              <div style={styles.statDivider}></div>
              <div style={styles.statItem}>
                <div style={styles.skeletonStatNumber}></div>
                <div style={styles.skeletonStatLabel}></div>
              </div>
              <div style={styles.statDivider}></div>
              <div style={styles.statItem}>
                <div style={styles.skeletonStatNumber}></div>
                <div style={styles.skeletonStatLabel}></div>
              </div>
            </div>
          </div>
        </div>
        <div style={styles.postsSection}>
          <div style={styles.postsHeader}>
            <div style={styles.skeletonPostsHeader}></div>
          </div>
          <div style={styles.postsGrid}>
            <div style={styles.skeletonPost}></div>
            <div style={styles.skeletonPost}></div>
            <div style={styles.skeletonPost}></div>
          </div>
        </div>
        <style>{`
          @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="error-container">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h2>User not found</h2>
        <p>The user you're looking for doesn't exist or has been removed.</p>
        <button
          onClick={() => navigate("/dashboard/feed")}
          className="go-back-btn"
        >
          Go to Feed
        </button>
      </div>
    );
  }

  return (
    <div className="profile-page" style={styles.page}>
      {/* Cover Image */}
      <div className="cover-container" style={styles.coverContainer}>
        <div className="cover-gradient" style={styles.coverGradient}></div>
      </div>

      {/* Profile Info */}
      <div className="profile-container" style={styles.profileContainer}>
        <div className="profile-avatar" style={styles.profileAvatar}>
          <img
            style={styles.avatarImage}
            src={
              user.profilePicture ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=fff&size=120&bold=true`
            }
            alt={user.name}
          />
          {user.role?.name === "Teacher" && (
            <span className="verified-badge" style={styles.verifiedBadge}>
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                style={styles.verifiedIcon}
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            </span>
          )}
        </div>

        <div className="profile-info" style={styles.profileInfo}>
          <div
            className="profile-name-section"
            style={styles.profileNameSection}
          >
            <h1 className="profile-name" style={styles.profileName}>
              {user.name}
            </h1>
            {!isOwnProfile && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                onMouseEnter={() => setIsHoveringFollow(true)}
                onMouseLeave={() => setIsHoveringFollow(false)}
                className={`follow-btn ${isFollowing ? "following" : ""}`}
                style={{
                  ...styles.followBtn,
                  ...(isFollowing ? styles.followBtnFollowing : {}),
                }}
              >
                {followLoading ? (
                  <div style={styles.btnSpinner}></div>
                ) : isFollowing ? (
                  isHoveringFollow ? (
                    <>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Unfollow
                    </>
                  ) : (
                    <>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      Following
                    </>
                  )
                ) : (
                  <>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <line x1="19" y1="8" x2="19" y2="14" />
                      <line x1="16" y1="11" x2="22" y2="11" />
                    </svg>
                    Follow
                  </>
                )}
              </button>
            )}
          </div>

          <p className="profile-email" style={styles.profileEmail}>
            {user.email}
          </p>

          <div className="profile-bio" style={styles.profileBio}>
            <p>{user.bio || "No bio added yet"}</p>
          </div>

          <div className="profile-stats" style={styles.profileStats}>
            <div
              className="stat-item"
              onClick={handleViewFollowers}
              style={styles.statItem}
            >
              <span className="stat-number" style={styles.statNumber}>
                {totalFollowers}
              </span>
              <span className="stat-label" style={styles.statLabel}>
                Followers
              </span>
            </div>
            <div className="stat-divider" style={styles.statDivider}></div>
            <div
              className="stat-item"
              onClick={handleViewFollowing}
              style={styles.statItem}
            >
              <span className="stat-number" style={styles.statNumber}>
                {totalFollowing}
              </span>
              <span className="stat-label" style={styles.statLabel}>
                Following
              </span>
            </div>
            <div className="stat-divider" style={styles.statDivider}></div>
            <div className="stat-item" style={styles.statItem}>
              <span className="stat-number" style={styles.statNumber}>
                {totalPosts}
              </span>
              <span className="stat-label" style={styles.statLabel}>
                Posts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Section */}
      <div className="posts-section" style={styles.postsSection}>
        <div className="posts-header" style={styles.postsHeader}>
          <h3 style={styles.postsHeaderTitle}>Posts</h3>
          <span className="posts-count" style={styles.postsCount}>
            {totalPosts}
          </span>
        </div>

        <div className="posts-grid" style={styles.postsGrid}>
          {loadingPosts && posts.length === 0 ? (
            <div className="loading-container" style={styles.loadingContainer}>
              <div
                className="loading-spinner"
                style={styles.loadingSpinner}
              ></div>
              <p style={styles.loadingText}>Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-posts" style={styles.emptyPosts}>
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <h3>No posts yet</h3>
              <p>
                {isOwnProfile
                  ? "Share your first post!"
                  : "This user hasn't created any posts yet."}
              </p>
            </div>
          ) : (
            <>
              {posts.map((post, index) => {
                const isLastPost = index === posts.length - 1;
                return (
                  <div
                    key={post._id}
                    ref={isLastPost ? lastPostElementRef : null}
                  >
                    <PostCard post={post} />
                  </div>
                );
              })}

              {loadingMorePosts && (
                <div
                  className="loading-more-container"
                  style={styles.loadingMoreContainer}
                >
                  <div
                    className="loading-spinner-small"
                    style={styles.loadingSpinnerSmall}
                  ></div>
                  <p style={styles.loadingMoreText}>Loading more posts...</p>
                </div>
              )}

              {!hasMorePosts && posts.length > 0 && (
                <div className="end-of-posts" style={styles.endOfPosts}>
                  <div className="end-line" style={styles.endLine}></div>
                  <p style={styles.endText}>
                    ✨ You've seen all {totalPosts} posts ✨
                  </p>
                  <div className="end-line" style={styles.endLine}></div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Followers Modal with Pagination */}
      {showFollowersModal && (
        <div
          className="modal-overlay"
          onClick={handleCloseFollowersModal}
          style={styles.modalOverlay}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={styles.modalContent}
          >
            <div className="modal-header" style={styles.modalHeader}>
              <h3>Followers ({totalFollowers})</h3>
              <button
                onClick={handleCloseFollowersModal}
                style={styles.modalCloseBtn}
              >
                ✕
              </button>
            </div>

            <div
              className="modal-search-container"
              style={styles.modalSearchContainer}
            >
              <svg
                className="search-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={styles.searchIcon}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search followers..."
                value={followersSearch}
                onChange={(e) => setFollowersSearch(e.target.value)}
                className="modal-search-input"
                style={styles.modalSearchInput}
              />
              {followersSearch && (
                <button
                  onClick={() => setFollowersSearch("")}
                  className="search-clear-btn"
                  style={styles.searchClearBtn}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="modal-body" style={styles.modalBody}>
              {filteredFollowers.length === 0 ? (
                <p className="modal-empty" style={styles.modalEmpty}>
                  {followersSearch
                    ? "No matching followers found"
                    : "No followers yet"}
                </p>
              ) : (
                filteredFollowers.map((item, index) => {
                  const userId = item?.follower?._id || item?._id;
                  const isCurrentUser = userId === currentUser?._id;
                  const isFollowingUser = modalFollowing[userId];
                  const isLastItem = index === filteredFollowers.length - 1;

                  return (
                    <div
                      key={item._id || userId}
                      ref={isLastItem ? lastFollowerElementRef : null}
                      className="user-list-item"
                      onClick={() => handleUserClick(userId)}
                      style={styles.userListItem}
                    >
                      <img
                        style={styles.userListAvatar}
                        src={
                          item.follower?.profilePicture ||
                          item.profilePicture ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(item.follower?.name || item.name)}`
                        }
                        alt={item.follower?.name || item.name}
                      />
                      <div
                        className="user-list-info"
                        style={styles.userListInfo}
                      >
                        <span
                          className="user-list-name"
                          style={styles.userListName}
                        >
                          {item.follower?.name || item.name}
                        </span>
                        <span
                          className="user-list-email"
                          style={styles.userListEmail}
                        >
                          {item.follower?.email || item.email}
                        </span>
                      </div>
                      {isCurrentUser ? (
                        <button className="you-btn" style={styles.youBtn}>
                          You
                        </button>
                      ) : (
                        <button
                          className={`follow-mini ${isFollowingUser ? "following" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleModalFollow(userId);
                          }}
                          style={{
                            ...styles.followMini,
                            ...(isFollowingUser
                              ? styles.followMiniFollowing
                              : {}),
                          }}
                        >
                          {isFollowingUser ? "Unfollow" : "Follow"}
                        </button>
                      )}
                    </div>
                  );
                })
              )}

              {loadingMoreFollowers && (
                <div className="loading-more-modal">
                  <div
                    className="loading-spinner-small"
                    style={styles.loadingSpinnerSmall}
                  ></div>
                  <p style={styles.loadingMoreText}>
                    Loading more followers...
                  </p>
                </div>
              )}

              {!hasMoreFollowers &&
                followersList.length > 0 &&
                !followersSearch && (
                  <div style={{ textAlign: "center", padding: "20px" }}>
                    <p
                      style={{
                        textAlign: "center",
                        margin: 0,
                        color: "#9ca3af",
                        fontSize: "13px",
                      }}
                    >
                      ✨ No more followers ✨
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Following Modal with Pagination */}
      {showFollowingModal && (
        <div
          className="modal-overlay"
          onClick={handleCloseFollowingModal}
          style={styles.modalOverlay}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={styles.modalContent}
          >
            <div className="modal-header" style={styles.modalHeader}>
              <h3>Following ({totalFollowing})</h3>
              <button
                onClick={handleCloseFollowingModal}
                style={styles.modalCloseBtn}
              >
                ✕
              </button>
            </div>

            <div
              className="modal-search-container"
              style={styles.modalSearchContainer}
            >
              <svg
                className="search-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={styles.searchIcon}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search following..."
                value={followingSearch}
                onChange={(e) => setFollowingSearch(e.target.value)}
                className="modal-search-input"
                style={styles.modalSearchInput}
              />
              {followingSearch && (
                <button
                  onClick={() => setFollowingSearch("")}
                  className="search-clear-btn"
                  style={styles.searchClearBtn}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="modal-body" style={styles.modalBody}>
              {filteredFollowing.length === 0 ? (
                <p className="modal-empty" style={styles.modalEmpty}>
                  {followingSearch
                    ? "No matching users found"
                    : "Not following anyone yet"}
                </p>
              ) : (
                filteredFollowing.map((item, index) => {
                  const userId = item?.following?._id || item?._id;
                  const isCurrentUser = userId === currentUser?._id;
                  const isFollowingUser = modalFollowing[userId];
                  const isLastItem = index === filteredFollowing.length - 1;

                  return (
                    <div
                      key={item._id || userId}
                      ref={isLastItem ? lastFollowingElementRef : null}
                      className="user-list-item"
                      onClick={() => handleUserClick(userId)}
                      style={styles.userListItem}
                    >
                      <img
                        style={styles.userListAvatar}
                        src={
                          item.following?.profilePicture ||
                          item.profilePicture ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(item.following?.name || item.name)}`
                        }
                        alt={item.following?.name || item.name}
                      />
                      <div
                        className="user-list-info"
                        style={styles.userListInfo}
                      >
                        <span
                          className="user-list-name"
                          style={styles.userListName}
                        >
                          {item.following?.name || item.name}
                        </span>
                        <span
                          className="user-list-email"
                          style={styles.userListEmail}
                        >
                          {item.following?.email || item.email}
                        </span>
                      </div>
                      {isCurrentUser ? (
                        <button className="you-btn" style={styles.youBtn}>
                          You
                        </button>
                      ) : (
                        <button
                          className={`follow-mini ${isFollowingUser ? "following" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleModalFollow(userId);
                          }}
                          style={{
                            ...styles.followMini,
                            ...(isFollowingUser
                              ? styles.followMiniFollowing
                              : {}),
                          }}
                        >
                          {isFollowingUser ? "Unfollow" : "Follow"}
                        </button>
                      )}
                    </div>
                  );
                })
              )}

              {loadingMoreFollowing && (
                <div className="loading-more-modal">
                  <div
                    className="loading-spinner-small"
                    style={styles.loadingSpinnerSmall}
                  ></div>
                  <p style={styles.loadingMoreText}>
                    Loading more following...
                  </p>
                </div>
              )}

              {!hasMoreFollowing &&
                followingList.length > 0 &&
                !followingSearch && (
                  <div style={{ textAlign: "center", padding: "20px" }}>
                    <p
                      style={{
                        textAlign: "center",
                        margin: 0,
                        color: "#9ca3af",
                        fontSize: "13px",
                      }}
                    >
                      ✨ No more following ✨
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// All styles defined as objects
const styles = {
  page: {
    maxWidth: "1000px",
    margin: "0 auto",
    background: "#f5f7fb",
    minHeight: "100vh",
  },

  // Skeleton styles
  skeletonCover: {
    height: "180px",
    borderRadius: "0 0 24px 24px",
    marginBottom: "-60px",
    background: "linear-gradient(90deg, #e0e0e0 0%, #f0f0f0 50%, #e0e0e0 100%)",
    backgroundSize: "1000px 100%",
    animation: "shimmer 1.5s infinite",
  },

  skeletonProfileContainer: {
    background: "white",
    borderRadius: "24px",
    margin: "0 24px 24px 24px",
    padding: "0 32px 32px 32px",
    minHeight: "280px",
  },

  skeletonAvatar: {
    width: "120px",
    height: "120px",
    borderRadius: "50%",
    margin: "-50px auto 16px auto",
    border: "4px solid white",
    background: "linear-gradient(90deg, #e0e0e0 0%, #f0f0f0 50%, #e0e0e0 100%)",
    backgroundSize: "1000px 100%",
    animation: "shimmer 1.5s infinite",
  },

  skeletonName: {
    width: "200px",
    height: "32px",
    borderRadius: "8px",
    margin: "0 auto",
    background: "linear-gradient(90deg, #e0e0e0 0%, #f0f0f0 50%, #e0e0e0 100%)",
    backgroundSize: "1000px 100%",
    animation: "shimmer 1.5s infinite",
  },

  skeletonButton: {
    width: "100px",
    height: "36px",
    borderRadius: "30px",
    background: "linear-gradient(90deg, #e0e0e0 0%, #f0f0f0 50%, #e0e0e0 100%)",
    backgroundSize: "1000px 100%",
    animation: "shimmer 1.5s infinite",
  },

  skeletonEmail: {
    width: "180px",
    height: "16px",
    borderRadius: "4px",
    margin: "12px auto",
    background: "linear-gradient(90deg, #e0e0e0 0%, #f0f0f0 50%, #e0e0e0 100%)",
    backgroundSize: "1000px 100%",
    animation: "shimmer 1.5s infinite",
  },

  skeletonBio: {
    width: "300px",
    height: "40px",
    borderRadius: "8px",
    margin: "0 auto 20px",
    background: "linear-gradient(90deg, #e0e0e0 0%, #f0f0f0 50%, #e0e0e0 100%)",
    backgroundSize: "1000px 100%",
    animation: "shimmer 1.5s infinite",
  },

  skeletonStatNumber: {
    width: "40px",
    height: "28px",
    borderRadius: "6px",
    margin: "0 auto 4px",
    background: "linear-gradient(90deg, #e0e0e0 0%, #f0f0f0 50%, #e0e0e0 100%)",
    backgroundSize: "1000px 100%",
    animation: "shimmer 1.5s infinite",
  },

  skeletonStatLabel: {
    width: "60px",
    height: "14px",
    borderRadius: "4px",
    margin: "0 auto",
    background: "linear-gradient(90deg, #e0e0e0 0%, #f0f0f0 50%, #e0e0e0 100%)",
    backgroundSize: "1000px 100%",
    animation: "shimmer 1.5s infinite",
  },

  skeletonPostsHeader: {
    width: "150px",
    height: "24px",
    borderRadius: "6px",
    background: "linear-gradient(90deg, #e0e0e0 0%, #f0f0f0 50%, #e0e0e0 100%)",
    backgroundSize: "1000px 100%",
    animation: "shimmer 1.5s infinite",
  },

  skeletonPost: {
    height: "300px",
    borderRadius: "24px",
    marginBottom: "20px",
    background: "linear-gradient(90deg, #e0e0e0 0%, #f0f0f0 50%, #e0e0e0 100%)",
    backgroundSize: "1000px 100%",
    animation: "shimmer 1.5s infinite",
  },

  // Loading states
  loadingContainer: {
    textAlign: "center",
    padding: "60px 20px",
    background: "white",
    borderRadius: "20px",
  },

  loadingSpinner: {
    width: "48px",
    height: "48px",
    border: "3px solid #f3f4f6",
    borderTopColor: "#667eea",
    borderRadius: "50%",
    margin: "0 auto 16px",
    animation: "spin 0.8s linear infinite",
  },

  loadingText: {
    color: "#6b7280",
    fontSize: "14px",
  },

  loadingMoreContainer: {
    textAlign: "center",
    padding: "30px 20px",
  },

  loadingSpinnerSmall: {
    width: "32px",
    height: "32px",
    border: "3px solid #f3f4f6",
    borderTopColor: "#667eea",
    borderRadius: "50%",
    margin: "0 auto 12px",
    animation: "spin 0.8s linear infinite",
  },

  loadingMoreText: {
    color: "#6b7280",
    fontSize: "13px",
  },

  endOfPosts: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    padding: "30px 20px",
  },

  endLine: {
    flex: 1,
    height: "1px",
    background: "linear-gradient(90deg, transparent, #cbd5e1, transparent)",
  },

  endText: {
    fontSize: "13px",
    color: "#6b7280",
    whiteSpace: "nowrap",
  },

  // Cover styles
  coverContainer: {
    height: "180px",
    borderRadius: "0 0 24px 24px",
    position: "relative",
  },

  coverGradient: {
    height: "100%",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    borderRadius: "0 0 24px 24px",
  },

  // Profile container
  profileContainer: {
    background: "white",
    borderRadius: "24px",
    margin: "-60px 24px 24px 24px",
    padding: "0 32px 32px 32px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
  },

  profileAvatar: {
    position: "relative",
    display: "inline-block",
    marginTop: "-50px",
    marginBottom: "16px",
  },

  avatarImage: {
    width: "120px",
    height: "120px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "4px solid white",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  },

  verifiedBadge: {
    position: "absolute",
    bottom: "8px",
    right: "8px",
    background: "#3b82f6",
    borderRadius: "50%",
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    border: "2px solid white",
  },

  verifiedIcon: {
    width: "16px",
    height: "16px",
  },

  profileInfo: {
    textAlign: "center",
  },

  profileNameSection: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    marginBottom: "8px",
    flexWrap: "wrap",
  },

  profileName: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#111827",
    margin: 0,
  },

  followBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 20px",
    border: "none",
    borderRadius: "30px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
    background: "#3b82f6",
    color: "white",
  },

  followBtnFollowing: {
    background: "#f3f4f6",
    color: "#374151",
    border: "1px solid #e5e7eb",
  },

  btnSpinner: {
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
  },

  profileEmail: {
    color: "#6b7280",
    fontSize: "14px",
    margin: "0 0 12px 0",
  },

  profileBio: {
    maxWidth: "500px",
    margin: "0 auto 20px",
    color: "#4b5563",
    fontSize: "14px",
    lineHeight: "1.6",
  },

  profileStats: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "32px",
    paddingTop: "16px",
    borderTop: "1px solid #e5e7eb",
  },

  statItem: {
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.2s",
  },

  statNumber: {
    display: "block",
    fontSize: "24px",
    fontWeight: "700",
    color: "#111827",
  },

  statLabel: {
    fontSize: "13px",
    color: "#6b7280",
  },

  statDivider: {
    width: "1px",
    height: "40px",
    background: "#e5e7eb",
  },

  // Posts section
  postsSection: {
    margin: "24px",
  },

  postsHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
    paddingBottom: "12px",
    borderBottom: "2px solid #e5e7eb",
  },

  postsHeaderTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#111827",
    margin: 0,
  },

  postsCount: {
    background: "#f3f4f6",
    padding: "2px 10px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#4b5563",
  },

  postsGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },

  emptyPosts: {
    textAlign: "center",
    padding: "60px 20px",
    background: "white",
    borderRadius: "20px",
  },

  // Modal styles
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },

  modalContent: {
    background: "white",
    borderRadius: "20px",
    width: "90%",
    maxWidth: "450px",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #e5e7eb",
  },

  modalCloseBtn: {
    background: "none",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    color: "#6b7280",
  },

  modalSearchContainer: {
    position: "relative",
    padding: "16px 20px",
    borderBottom: "1px solid #e5e7eb",
  },

  searchIcon: {
    position: "absolute",
    left: "32px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#9ca3af",
  },

  modalSearchInput: {
    width: "100%",
    padding: "10px 35px 10px 38px",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    fontSize: "14px",
    outline: "none",
  },

  searchClearBtn: {
    position: "absolute",
    right: "32px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#9ca3af",
    fontSize: "14px",
    padding: 0,
    width: "20px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
  },

  modalBody: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 0",
  },

  userListItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 20px",
    cursor: "pointer",
    transition: "background 0.2s",
  },

  userListAvatar: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    objectFit: "cover",
  },

  userListInfo: {
    flex: 1,
  },

  userListName: {
    display: "block",
    fontWeight: "600",
    color: "#111827",
    marginBottom: "4px",
  },

  userListEmail: {
    fontSize: "12px",
    color: "#6b7280",
  },

  followMini: {
    marginLeft: "auto",
    padding: "6px 14px",
    border: "none",
    borderRadius: "999px",
    background: "#667eea",
    color: "white",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
    transition: "all 0.2s",
  },

  followMiniFollowing: {
    background: "#f3f4f6",
    color: "#374151",
    border: "1px solid #e5e7eb",
  },

  youBtn: {
    marginLeft: "auto",
    padding: "6px 14px",
    border: "none",
    borderRadius: "999px",
    background: "#e5e7eb",
    color: "#4b5563",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "default",
  },

  modalEmpty: {
    textAlign: "center",
    padding: "40px",
    color: "#6b7280",
  },

  loadingMoreModal: {
    textAlign: "center",
    padding: "20px",
  },

  endOfModal: {
    textAlign: "center",
    padding: "20px",
    color: "#6b7280",
    fontSize: "12px",
  },
};

// Add keyframes globally
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes shimmer {
      0% { background-position: -1000px 0; }
      100% { background-position: 1000px 0; }
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .follow-btn:hover:not(:disabled) {
      transform: translateY(-1px);
    }
    
    .follow-btn.following:hover {
      background: #fee2e2;
      color: #dc2626;
      border-color: #fecaca;
    }
    
    .follow-mini:hover {
      background: #5a67d8;
      transform: translateY(-1px);
    }
    
    .follow-mini.following:hover {
      background: #fee2e2;
      color: #dc2626;
      border-color: #fecaca;
    }
    
    .stat-item:hover {
      transform: translateY(-2px);
    }
    
    .user-list-item:hover {
      background: #f3f4f6;
    }
    
    .modal-search-input:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    
    .search-clear-btn:hover {
      background: #f3f4f6;
      color: #4b5563;
    }
    
    @media (max-width: 768px) {
      .profile-container {
        margin: -60px 16px 20px 16px;
        padding: 0 20px 20px 20px;
      }
      
      .profile-name {
        font-size: 24px;
      }
      
      .profile-stats {
        gap: 20px;
      }
      
      .stat-number {
        font-size: 20px;
      }
      
      .posts-section {
        margin: 20px 16px;
      }
    }
    
    @media (max-width: 480px) {
      .profile-name-section {
        flex-direction: column;
        gap: 12px;
      }
      
      .profile-stats {
        gap: 16px;
      }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default UserProfilePage;
