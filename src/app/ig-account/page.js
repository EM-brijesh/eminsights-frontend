// "use client";
// import { useSearchParams } from "next/navigation";
// import { useEffect, useState } from "react";

// export default function IGAccount() {
//   const params = useSearchParams();
//   const pageId = params.get("pageId");
//   const pageToken = params.get("pageToken");

//   const [ig, setIg] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState("");

//   useEffect(() => {
//     if (!pageId || !pageToken) {
//       setErr("Missing pageId or pageToken");
//       setLoading(false);
//       return;
//     }

//     async function fetchIG() {
//       try {
//         const res = await fetch(
//           `http://localhost:5050/api/ig-account?pageId=${pageId}&pageToken=${pageToken}`
//         );
//         const data = await res.json();

//         if (data.error) {
//           setErr(data.error);
//         } else {
//           setIg(data.connected_instagram_account || null);
//         }
//       } catch (e) {
//         setErr("Server error");
//       } finally {
//         setLoading(false);
//       }
//     }

//     fetchIG();
//   }, [pageId, pageToken]);

//   if (loading) return <p className="p-6 text-white">Loading Instagram account...</p>;
//   if (err) return <p className="p-6 text-red-500">{err}</p>;

//   return (
//     <main className="p-6 text-white">
//       <h1 className="text-3xl font-bold">Instagram Account Connected</h1>

//       {ig ? (
//         <div className="mt-4">
//           <p><strong>Username:</strong> @{ig.username}</p>
//           <p><strong>Instagram ID:</strong> {ig.id}</p>

//           <a href="/hashtag-search">
//             <button className="bg-blue-500 mt-4 px-4 py-2 rounded">
//               Continue to Hashtag Search
//             </button>
//           </a>
//         </div>
//       ) : (
//         <div className="mt-4">
//           <p>No Instagram Business Account is linked to this Facebook Page.</p>
//           <p className="mt-2 text-gray-400">
//             Go to your Facebook Page → Settings → Linked Accounts → Instagram → Connect Account.
//           </p>
//         </div>
//       )}
//     </main>
//   );
// }
