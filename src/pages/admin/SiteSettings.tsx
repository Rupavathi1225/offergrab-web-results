import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function SiteSettings() {
  const [s, setS] = useState<any>(null);
  const [social, setSocial] = useState("");
  const [tickers, setTickers] = useState("");

  useEffect(() => {
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => {
      setS(data);
      setSocial(JSON.stringify(data?.social_urls ?? {}, null, 2));
      setTickers(JSON.stringify(data?.ticker_items ?? [], null, 2));
    });
  }, []);

  if (!s) return <div>Loading…</div>;

  const save = async () => {
    let social_urls, ticker_items;
    try { social_urls = JSON.parse(social); ticker_items = JSON.parse(tickers); }
    catch { return toast.error("Invalid JSON in social or tickers"); }
    const { error } = await supabase.from("site_settings").update({
      notif_enabled: s.notif_enabled, notif_text: s.notif_text, notif_link: s.notif_link,
      deal_enabled: s.deal_enabled, deal_title: s.deal_title, deal_desc: s.deal_desc, deal_cta_text: s.deal_cta_text, deal_cta_url: s.deal_cta_url,
      social_urls, ticker_items,
    }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-2xl font-bold">Site Settings</h2>

      <section className="border rounded p-4 space-y-3">
        <div className="flex items-center gap-2"><Switch checked={s.notif_enabled} onCheckedChange={v => setS({ ...s, notif_enabled: v })} /><Label>Notification bar enabled</Label></div>
        <div><Label>Text</Label><Input value={s.notif_text || ""} onChange={e => setS({ ...s, notif_text: e.target.value })} /></div>
        <div><Label>Link</Label><Input value={s.notif_link || ""} onChange={e => setS({ ...s, notif_link: e.target.value })} /></div>
      </section>

      <section className="border rounded p-4 space-y-3">
        <div className="flex items-center gap-2"><Switch checked={s.deal_enabled} onCheckedChange={v => setS({ ...s, deal_enabled: v })} /><Label>Deal of the Week enabled</Label></div>
        <div><Label>Title</Label><Input value={s.deal_title || ""} onChange={e => setS({ ...s, deal_title: e.target.value })} /></div>
        <div><Label>Description</Label><Textarea value={s.deal_desc || ""} onChange={e => setS({ ...s, deal_desc: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>CTA text</Label><Input value={s.deal_cta_text || ""} onChange={e => setS({ ...s, deal_cta_text: e.target.value })} /></div>
          <div><Label>CTA URL</Label><Input value={s.deal_cta_url || ""} onChange={e => setS({ ...s, deal_cta_url: e.target.value })} /></div>
        </div>
      </section>

      <section className="border rounded p-4 space-y-3">
        <Label>Social URLs (JSON)</Label>
        <Textarea rows={8} value={social} onChange={e => setSocial(e.target.value)} className="font-mono text-xs" />
      </section>

      <section className="border rounded p-4 space-y-3">
        <Label>Ticker items (JSON array)</Label>
        <Textarea rows={6} value={tickers} onChange={e => setTickers(e.target.value)} className="font-mono text-xs" />
      </section>

      <Button onClick={save}>Save Settings</Button>
    </div>
  );
}
