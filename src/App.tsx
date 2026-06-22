/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Analytics } from '@vercel/analytics/react';
import Photobooth from './components/Photobooth';

export default function App() {
  return (
    <div className="min-h-screen bg-[#0c0c0c] flex flex-col">
      <Photobooth />
      <Analytics />
    </div>
  );
}

