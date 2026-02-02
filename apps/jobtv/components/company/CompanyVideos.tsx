import HorizontalScrollContainer from "@/components/HorizontalScrollContainer";
import VideoPlayer from "@/components/VideoPlayer";
import type { CompanyData } from "./types";

interface CompanyVideosProps {
  company: CompanyData;
}

export default function CompanyVideos({ company }: CompanyVideosProps) {
  if (!company.documentaryVideos || company.documentaryVideos.length === 0) return null;

  return (
    <section className="-mx-4 md:-mx-0">
      <h2 className="px-4 md:px-0 text-lg md:text-xl font-bold mb-4 md:mb-6 flex items-center gap-2">
        <span className="w-1.5 h-5 md:h-6 bg-red-600 rounded-full" />
        動画
      </h2>
      <HorizontalScrollContainer ignoreParentPadding={true}>
        <div className="flex gap-4 md:gap-6 min-w-max px-4 md:px-0">
          {company.documentaryVideos.map((video) => (
            <div key={video.id} className="flex-shrink-0 w-[320px] md:w-[400px] shadow-2xl overflow-hidden">
              <VideoPlayer
                src={video.video}
                poster={video.thumbnail || company.coverImage || undefined}
                className="w-full aspect-video rounded-lg overflow-hidden"
              />
              {video.title && (
                <div className="p-3 md:p-4 h-full">
                  <h3 className="text-sm md:text-base font-bold text-white line-clamp-2">{video.title}</h3>
                </div>
              )}
            </div>
          ))}
        </div>
      </HorizontalScrollContainer>
    </section>
  );
}

