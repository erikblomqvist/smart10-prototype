<script>
	/** @type {{ navigate: (path: string) => void }} */
	let { navigate } = $props();
</script>

<div class="admin-page">
	<h1 class="admin-page__title">Dashboard</h1>
	<div class="admin-dashboard">
		<button class="admin-dashboard__card" type="button" onclick={() => navigate('/decks')}>
			<strong>Decks</strong>
			<span>Manage question decks</span>
		</button>
		<button class="admin-dashboard__card" type="button" onclick={() => navigate('/questions')}>
			<strong>Questions</strong>
			<span>Manage questions</span>
		</button>
		<button class="admin-dashboard__card" type="button" onclick={() => navigate('/users')}>
			<strong>Users</strong>
			<span>Manage admin access</span>
		</button>
	</div>
</div>
