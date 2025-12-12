// "use client";
// import { useEffect, useState } from "react";

// export default function Dashboard() {
//   const [pages, setPages] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState("");

//   useEffect(() => {
//     async function getPages() {
//       try {
//         const res = await fetch("http://localhost:5050/api/pages", {
//           credentials: "include" // important to send cookie
//         });
//         const data = await res.json();
//         if (res.status !== 200) {
//           setErr(data.error || "Failed to fetch pages");
//           setPages([]);
//         } else {
//           setPages(data.data || []);
//         }
//       } catch (e) {
//         setErr("Server error");
//         setPages([]);
//       } finally {
//         setLoading(false);
//       }
//     }
//     getPages();
//   }, []);

//   if (loading) return <div style={{ padding: 20 }}>Loading pages...</div>;
//   if (err) return <div style={{ padding: 20, color: "red" }}>Error: {err}</div>;
//   if (!pages || pages.length === 0) return <div style={{ padding: 20 }}>No pages found for this user.</div>;

//   return (
//     <main style={{ padding: 20 }}>
//       <h2>Select a Facebook Page</h2>
//       <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
//         {pages.map(p => (
//           <div key={p.id} style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
//             <h3>{p.name}</h3>
//             <p>Page ID: {p.id}</p>
//             <p>Category: {p.category || "N/A"}</p>
//             <a href={`/ig-account?pageId=${p.id}&pageToken=${encodeURIComponent(p.access_token)}`}>
//               <button style={{ padding: "8px 12px" }}>Select Page</button>
//             </a>
//           </div>
//         ))}
//       </div>
//     </main>
//   );
// }
