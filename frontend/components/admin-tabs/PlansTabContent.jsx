import DataCard from '../DataCard';
import { prettyJson } from '../../lib/format';

export default function PlansTabContent({ catalogue, entitlements, subscription }) {
  return (
    <>
      <DataCard title="Current subscription"><pre>{prettyJson(subscription)}</pre></DataCard>
      <DataCard title="Effective entitlements"><pre>{prettyJson(entitlements)}</pre></DataCard>
      <DataCard title="Plan catalogue"><pre>{prettyJson(catalogue)}</pre></DataCard>
    </>
  );
}
