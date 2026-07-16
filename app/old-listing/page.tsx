import Link from "next/link";

import { oldListing } from "./data";

function formatPayload(payload: unknown) {
  return JSON.stringify(payload, null, 2);
}

export default function OldListingPage() {
  return (
    <main className="min-h-screen bg-[#f5f1e8] px-5 py-8 text-[#20201d] sm:px-8 lg:px-12">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-5 border-b border-[#cfc6b4] pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#786449]">
              Legacy Reference
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#151512] sm:text-5xl">
              Old Listing
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#5d584f]">
              This page keeps the legacy Simpleview-style listing shape separate from the live iDSS consolidated feed.
            </p>
          </div>

          <Link
            href="/"
            className="border border-[#cfc6b4] bg-white/70 px-3 py-2 text-sm font-medium text-[#20201d] hover:bg-[#fffaf0]"
          >
            Back to live feed
          </Link>
        </div>

        <article className="border border-[#a99b82] bg-[#fffaf0] p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#786449]">
                Old Listing
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                {oldListing.company}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#625c52]">
                {oldListing.description}
              </p>
            </div>

            <dl className="grid gap-2 text-sm text-[#5d584f] sm:grid-cols-3 lg:min-w-[360px]">
              <div>
                <dt className="font-semibold text-[#20201d]">Record</dt>
                <dd>{oldListing.recid}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#20201d]">Media</dt>
                <dd>{oldListing.media.length}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#20201d]">Rooms</dt>
                <dd>{oldListing.meetingrooms.length}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <section className="border border-[#d9d0bd] bg-white/70 p-4">
              <h3 className="text-lg font-semibold">Summary</h3>
              <dl className="mt-3 grid gap-2 text-sm text-[#5d584f] sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-[#20201d]">Address</dt>
                  <dd>{oldListing.address1}, {oldListing.city}, {oldListing.state} {oldListing.zip}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">Category</dt>
                  <dd>
                    {oldListing.categories[0].catname} - {oldListing.categories[0].subcatname}
                    <span className="block text-xs">
                      catid {oldListing.categories[0].catid}, subcatid {oldListing.categories[0].subcatid}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">Contact</dt>
                  <dd>{oldListing.fullname}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">Email</dt>
                  <dd className="break-all">{oldListing.contact_email}</dd>
                </div>
              </dl>
            </section>

            <section className="border border-[#d9d0bd] bg-white/70 p-4">
              <h3 className="text-lg font-semibold">Meeting Facility</h3>
              <dl className="mt-3 grid gap-2 text-sm text-[#5d584f] sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-[#20201d]">Total Sq. Ft.</dt>
                  <dd>{oldListing.meetingfacility.totalsqft}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">Largest Room</dt>
                  <dd>{oldListing.meetingfacility.largestroom}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">Meeting Rooms</dt>
                  <dd>{oldListing.meetingfacility.numrooms}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">Guest Capacity</dt>
                  <dd>{oldListing.meetingfacility.additional_object.guestcapacity.value}</dd>
                </div>
              </dl>
            </section>
          </div>

          <section className="mt-5 border border-[#d9d0bd] bg-white/70 p-4">
            <h3 className="text-lg font-semibold">Media</h3>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {oldListing.media.map((image) => (
                <a
                  key={image.mediaid}
                  href={image.mediaurl}
                  target="_blank"
                  rel="noreferrer"
                  className="border border-[#d9d0bd] bg-white p-3 text-[#20201d] hover:bg-[#f5f1e8]"
                >
                  <span className="font-semibold">{image.sortorder}. {image.medianame}</span>
                  <span className="mt-1 block break-all text-xs text-[#625c52]">
                    {image.mediaurl}
                  </span>
                </a>
              ))}
            </div>
          </section>

          <section className="mt-5 border border-[#d9d0bd] bg-white/70 p-4">
            <h3 className="text-lg font-semibold">Meeting Rooms</h3>
            <div className="mt-3 overflow-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="text-[#625c52]">
                  <tr>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">Room</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">Sq. Ft.</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">Banquet</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">Classroom</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">Reception</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">Theater</th>
                  </tr>
                </thead>
                <tbody>
                  {oldListing.meetingrooms.map((room) => (
                    <tr key={room.roomid}>
                      <td className="border-b border-[#ece4d4] py-2 pr-4 font-medium">
                        {room.roomname}
                      </td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">{room.sqft}</td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">{room.banquet}</td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">{room.classroom}</td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">{room.reception}</td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">{room.theater}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <pre className="mt-5 max-h-96 overflow-auto border border-[#d9d0bd] bg-[#1f211d] p-4 text-xs leading-5 text-[#f5f1e8]">
            {formatPayload(oldListing)}
          </pre>
        </article>
      </section>
    </main>
  );
}