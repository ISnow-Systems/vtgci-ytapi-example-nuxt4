<script setup lang="ts">
import {RefreshCw, Zap} from "lucide-vue-next"
import {TriState} from "#shared/ExtendUtils";
import type {SearchResponse, VideoItem, VideoType} from "#shared/youtubeApi/Types";
import {YouTubeAPI} from "#shared/youtubeApi/YouTubeAPI";

const videos = toRef<VideoItem[]>([]);
const loading = toRef(true);
const filter = toRef<'all' | 'video' | 'live' | 'short' | 'premiere'>('all');
const wsStatus = toRef<'connecting' | 'connected' | 'disconnected'>('disconnected');
const hasUpdate = toRef(false);
const socketRef = toRef<WebSocket | null>(null);
const runtimeConfig = useRuntimeConfig();

const VTGCI_YTAPI_BASE_URL = (runtimeConfig.public.VTGCI_API_ORIGIN_URL ?? "https://infra.virtlive.jp") + (runtimeConfig.public.VTGCI_YTAPI_BASE_PATH ?? "/api/youtube/v3");
const VTGCI_WS_BASE_URL = (runtimeConfig.public.VTGCI_API_ORIGIN_URL ?? "https://infra.virtlive.jp") + (runtimeConfig.public.VTGCI_WS_BASE_PATH ?? "/ws/youtube").replace(/^http/, 'ws');

const api = new YouTubeAPI(VTGCI_YTAPI_BASE_URL)

const filterButtons = {
	all: 'すべて',
	video: '動画',
	live: '配信',
	premiere: 'プレミア公開',
	short: 'Shorts',
} as const;

// データ取得関数
const fetchVideos = async (typeFilter: VideoType[] = [], isShorts: TriState = TriState.Default) => {
	loading.value = true;
	try {
		// API呼び出し
		const res = await $fetch<SearchResponse>(api.getSearchApiEndpoint({
			type: typeFilter.length == 0 ? undefined : typeFilter,
			isShorts
		}));
		if (!res) {
			console.error('Failed to fetch videos');
			return
		}
		const data: SearchResponse = res;

		videos.value = data.items;
	} catch (err) {
		console.error('Failed to fetch videos:', err);
	} finally {
		loading.value = false;
		hasUpdate.value = false;
	}
};

const fetchVideosEvent = () => {
	switch (filter.value) {
		case 'all':
			fetchVideos([], TriState.Default);
			break;
		case 'live':
			fetchVideos(['liveBefore', "liveNow", "liveAfter"], TriState.No);
			break;
		case 'short':
			fetchVideos(["video"], TriState.Yes);
			break;
		case 'premiere':
			fetchVideos(['premiereBefore', "premiereNow", "premiereAfter"], TriState.No);
			break;
		default:
			fetchVideos(['video'], TriState.Default);
			break;
	}
}

watch(filter, fetchVideosEvent);

onMounted(() => {
	fetchVideosEvent();

	// WebSocket接続管理
	const connectWs = () => {
		wsStatus.value = 'connecting';
		const ws = new WebSocket(`${VTGCI_WS_BASE_URL}/notify`);

		ws.onopen = () => {
			wsStatus.value = 'connected';
			console.log('WS Connected');
		};

		ws.onmessage = async (event) => {
			// pingはブラウザが自動処理する場合もあるが、明示的な場合
			if (event.data === 'ping') {
				ws.send('pong');
				return;
			}

			// 5分毎のキャッシュ更新完了通知
			if (event.data === 'fullyUpdated') {
				let typeFilter: VideoType[], isShorts: TriState;
				switch (filter.value) {
					case 'all':
						typeFilter = [];
						isShorts = TriState.Default;
						break;
					case 'live':
						typeFilter = ['liveBefore', "liveNow", "liveAfter"];
						isShorts = TriState.No;
						break;
					case 'short':
						typeFilter = ["video"];
						isShorts = TriState.Yes;
						break;
					case 'premiere':
						typeFilter = ['premiereBefore', "premiereNow", "premiereAfter"];
						isShorts = TriState.No;
						break;
					default:
						typeFilter = ['video'];
						isShorts = TriState.Default;
						break;
				}
				const res = await fetch(api.getSearchApiEndpoint({
					type: typeFilter.length == 0 ? undefined : typeFilter,
					isShorts
				}));
				if (!res.ok) {
					hasUpdate.value = true;
				} else {
					const data: SearchResponse = await res.json();
					if (
						videos.value.filter(v => !data.items.some(i => i.videoId === v.videoId)).length > 0) hasUpdate.value = true;
				}
			}
		};

		ws.onclose = () => {
			wsStatus.value = 'disconnected';
			// 再接続ロジック（簡易版）
			setTimeout(connectWs, 5000);
		};

		socketRef.value = ws;
	};

	connectWs();
});

onUnmounted(() => socketRef.value?.close());
</script>

<template>
	<div class="w-full max-w-7xl mx-auto p-4 md:p-8 font-sans bg-gray-50 dark:bg-gray-900 min-h-screen">
		<div class="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
			<div>
				<h2 class="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white mb-2 tracking-tight">
					LATEST MOVIES
				</h2>
				<p class="text-sm text-gray-500 dark:text-gray-400">
					所属タレントの最新動画・配信情報
				</p>
			</div>

			<div
				class="flex items-center gap-2 p-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
				<button
					v-for="(v, f) in filterButtons"
					:key="f"
					@click="() => {filter = f}"
					:class="`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${filter === f ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`" v-text="v" />
			</div>
		</div>

		<div :class="`transition-all duration-500 ease-in-out overflow-hidden ${hasUpdate ? 'max-h-20 opacity-100 mb-6' : 'max-h-0 opacity-0 mb-0'}`">
			<button
				@click="fetchVideosEvent"
				class="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl shadow-md flex items-center justify-center gap-2 font-bold transition-colors">
				<RefreshCw class="animate-spin-slow" :size="18" />
				リストが更新されました。クリックして最新を表示
			</button>
		</div>

		<div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
			<div v-for="i in 8" :key="i" class="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm h-64 animate-pulse">
				<div class="h-36 bg-gray-200 dark:bg-gray-700"/>
				<div class="p-4 space-y-3">
					<div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"/>
					<div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"/>
				</div>
			</div>
		</div>
		<template v-else>
			<div v-if="videos.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				<VideoCard v-for="v in videos" :key="v.videoId" :video="v" />
			</div>
			<div v-else class="text-center py-20 text-gray-400">
				<div class="mb-4 flex justify-center">
					<Zap :size="48" class="text-gray-300 dark:text-gray-700"/>
				</div>
				<p>該当する動画が見つかりませんでした。</p>
			</div>
		</template>
	</div>
</template>

<style scoped>

</style>
