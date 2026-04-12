import BackupSnapshotPanel from './BackupSnapshotPanel'
export default function FileRecoveryPage() {
  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-5 space-y-4" style={{ background: '#F5F5DC' }}>
      <p className="font-semibold text-lg" style={{ color: '#1a1a1a' }}>Backups & Recovery</p>
      <div className="h-[600px]"><BackupSnapshotPanel /></div>
    </div>
  )
}
