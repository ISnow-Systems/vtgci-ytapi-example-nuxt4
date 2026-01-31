<script setup lang="ts">
import {Archive, Calendar, Clock, Play, Radio, RefreshCw, Smartphone, Spotlight, Zap} from "lucide-vue-next"
import type {LiveStream, LiveStreamArchive, UpcomingLiveStream, VideoItem} from "#shared/youtubeApi/Types";

const isHovered = toRef(false);
const imageLoaded = toRef(false);

const { video } = defineProps<{ video: VideoItem }>();
const runtimeConfig = useRuntimeConfig();

const VTGCI_YTAPI_BASE_URL = (runtimeConfig.public.VTGCI_API_ORIGIN_URL ?? "https://infra.virtlive.jp") + (runtimeConfig.public.VTGCI_YTAPI_BASE_PATH ?? "/api/youtube/v3");
const VTGCI_WS_BASE_URL = (runtimeConfig.public.VTGCI_API_ORIGIN_URL ?? "https://infra.virtlive.jp") + (runtimeConfig.public.VTGCI_WS_BASE_PATH ?? "/ws/youtube").replace(/^http/, 'ws');

const isLive = video.contentTypeCategory === 'live';
const isShort = video.contentTypeCategory === 'shorts';
const isPremiere = video.contentTypeCategory === 'premiere';
const isVideo = video.contentTypeCategory === 'video';
const isUpcoming = video.contentTypeValue === 'liveBefore' || video.contentTypeValue === 'premiereBefore';
const isArchive = video.contentTypeValue === 'liveAfter' || video.contentTypeValue === 'premiereAfter';
const isNow = video.contentTypeValue === 'liveNow' || video.contentTypeValue === 'premiereNow';

// サムネイルURLの選定
const thumbUrl = video.thumbnails.maxres?.url || video.thumbnails.high?.url || video.thumbnails.medium?.url || video.thumbnails.standard?.url || video.thumbnails.default?.url || video.thumbnail;
const thumbnailColorY =
	video.thumbnailColor.rgb.r / 255 * 0.299 +
	video.thumbnailColor.rgb.g / 255 * 0.587 +
	video.thumbnailColor.rgb.b / 255 * 0.114;

const formatDate = (dateString: string, beforeMes: string | null = "前", nowMes: string | null = "たった今", afterMes: string | null = "後") => {
	beforeMes ??= "前";
	afterMes ??= "後";
	nowMes ??= "たった今";
	const date = new Date(dateString);
	const now = new Date();
	const diffDirectionIsAfter = date.getTime() > now.getTime();
	const diff = Math.abs(now.getTime() - date.getTime());
	const diffM = Math.abs((now.getFullYear() * 12 + now.getMonth()) - (date.getFullYear() * 12 + date.getMonth()))
	const formatter = new Intl.DurationFormat('ja-JP', {style: 'short'});

	if (diff < 60_000 && nowMes !== "") {
		return nowMes;
	} else if (diff < 3600_000) {
		// 1時間以内なら分単位の相対表示
		return `${formatter.format(`PT${Math.round(diff / 1000 / 60)}M`)}${diffDirectionIsAfter ? afterMes : beforeMes}`;
	} else if (diff < 86400_000) {
		// 24時間以内なら時間単位の相対表示
		return `${formatter.format(`PT${Math.round(diff / 1000 / 3600)}H`)}${diffDirectionIsAfter ? afterMes : beforeMes}`;
	} else if (diffM >= 24) {
		return `${formatter.format(`P${Math.round(diffM / 12)}Y`)}${diffDirectionIsAfter ? afterMes : beforeMes}`;
	} else if (diffM >= 6) {
		return `${formatter.format(`P${Math.floor(diffM / 12)}Y${Math.floor(diffM % 12)}M`)}${diffDirectionIsAfter ? afterMes : beforeMes}`;
	}
	return date.toLocaleDateString('ja-JP', {month: 'short', day: 'numeric'});
};

</script>

<template>
	<a :href="`https://www.youtube.com/${isShort ? 'shorts/' : 'watch?v='}${video.videoId}`" target="_blank" rel="noopener noreferrer" class="group flex flex-col relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1" @mouseEnter="() => {isHovered = true}" @mouseLeave="() => {isHovered = false}" :style="{ '--theme-color': video.thumbnailColor.hexadecimal }">
		<div class="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-700">
			<img v-if="!imageLoaded" :src="`${VTGCI_YTAPI_BASE_URL}/thumbnails/${video.videoId}/placeholder`" alt="" class="absolute inset-0 w-full h-full object-cover filter blur-lg scale-110">
			<img :src="thumbUrl" :alt="video.title" :class="`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`" @load="() => {imageLoaded = true}">
			<div :class="`absolute inset-0 bg-black/20 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`"/>
			<div class="`absolute inset-0 flex items-center justify-center transition-all duration-300 ${isHovered ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`">
				<div class="w-12 h-12 rounded-full flex items-center justify-center shadow-lg" :style="{ backgroundColor: video.thumbnailColor.hexadecimal, color: thumbnailColorY > 0.5 ? 'black' : 'white' }">
					<Play fill="currentColor" :size="20" class="ml-1"/>
				</div>
			</div>

			<div class="absolute top-2 left-2 flex gap-1">
				<span v-if="isLive && isNow" class="flex items-center gap-1 px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-lg shadow-sm animate-pulse">
					<Radio :size="12"/> LIVE
				</span>
				<span v-else-if="isPremiere && isNow" class="flex items-center gap-1 px-2 py-1 bg-amber-600 text-white text-xs font-bold rounded-lg shadow-sm animate-pulse">
					<Spotlight :size="12"/> PREMIERE
				</span>
				<span v-else-if="(isLive || isPremiere) && isUpcoming" class="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm">
					<Calendar :size="12"/> SCHEDULE
				</span>
				<span v-else-if="isLive && isArchive" class="flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-xs font-bold rounded-lg shadow-sm">
					<Archive :size="12"/> ARCHIVE
				</span>
				<span v-else-if="isShort" class="flex items-center gap-1 px-2 py-1 bg-black/70 backdrop-blur-sm text-white text-xs font-bold rounded-lg shadow-sm border border-white/20">
					<Smartphone :size="12" fill="currentColor"/> SHORTS
				</span>
				<span v-else-if="isVideo || (isPremiere && isArchive)" class="flex items-center gap-1 px-2 py-1 bg-black/70 backdrop-blur-sm text-white text-xs font-bold rounded-lg shadow-sm border border-white/20">
					<Play :size="12"/> VIDEO
				</span>
			</div>
		</div>

		<div class="p-4 relative flex-1 flex flex-col">
			<div class="absolute left-0 top-4 bottom-4 w-1 grow-0 shrink-0 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" :style="{backgroundColor: video.thumbnailColor.hexadecimal}"/>
			<div class="grow flex flex-col w-full justify-between">
				<h3 class="text-sm font-bold grow text-gray-800 dark:text-gray-100 line-clamp-2 leading-relaxed decoration-2 group-hover:underline group-hover:decoration-(--theme-color) transition-colors mb-2 w-full" v-text="video.title" />

				<div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
					<div class="flex items-center gap-1.5 overflow-hidden">
						<span class="truncate" v-text="video.channelTitle" />
					</div>
					<div class="flex items-center gap-1 shrink-0 whitespace-nowrap">
						<Clock :size="10"/>
						<span v-if="isUpcoming" v-text="formatDate((video as UpcomingLiveStream).liveScheduledStartTime ?? video.publishedAt, '前', null, '後')" />
						<span v-else-if="isNow" v-text="formatDate((video as LiveStream).liveActualStartTime, '経過', null, null)" />
						<span v-else-if="isArchive" v-text="formatDate((video as LiveStreamArchive).liveActualEndTime, '前', null, null)" />
						<span v-else-if="isVideo || isShort" v-text="formatDate(video.publishedAt, '前', null, null)" />
					</div>
				</div>
			</div>
		</div>
	</a>
</template>

<style scoped>

</style>
