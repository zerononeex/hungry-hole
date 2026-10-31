import pyarrow.fs as fs, pyarrow.parquet as pq, pyarrow as pa, pyarrow.compute as pc, os
from concurrent.futures import ThreadPoolExecutor
X0,X1,Y0,Y1=-123.33,-122.55,48.97,50.18
REL='overturemaps-us-west-2/release/2026-10-21.0/theme=places/type=place/'
s3=fs.S3FileSystem(anonymous=True, region='us-west-2', proxy_options=os.environ.get('HTTPS_PROXY'))
def stats(md,rg,name):
    for i in range(md.num_columns):
        c=md.row_group(rg).column(i)
        if c.path_in_schema=='bbox.'+name: return c.statistics.min, c.statistics.max
files=[f.path for f in s3.get_file_info(fs.FileSelector(REL)) if f.path.endswith('.parquet')]
print(len(files),flush=True)
def one(path):
    pf=pq.ParquetFile(path, filesystem=s3); md=pf.metadata; rgs=[]
    for rg in range(md.num_row_groups):
        a=stats(md,rg,'xmin'); b=stats(md,rg,'xmax'); c=stats(md,rg,'ymin'); d=stats(md,rg,'ymax')
        if a[0] <= X1 and b[1] >= X0 and c[0] <= Y1 and d[1] >= Y0: rgs.append(rg)
    if not rgs: return None
    cols=[c for c in ['names','categories','basic_category','confidence','geometry','bbox'] if c in pf.schema_arrow.names]
    t=pf.read_row_groups(rgs, columns=cols)
    bb=t.column('bbox')
    m=pc.and_(pc.and_(pc.less_equal(pc.struct_field(bb,'xmin'),X1), pc.greater_equal(pc.struct_field(bb,'xmax'),X0)),
              pc.and_(pc.less_equal(pc.struct_field(bb,'ymin'),Y1), pc.greater_equal(pc.struct_field(bb,'ymax'),Y0)))
    t=t.filter(m); print(path[-30:],len(rgs),t.num_rows,flush=True); return t
out=[]
with ThreadPoolExecutor(8) as ex:
    for t in ex.map(one, files):
        if t is not None and t.num_rows: out.append(t)
T=pa.concat_tables(out, promote_options='default'); pq.write_table(T,'places.parquet'); print('DONE',T.num_rows,flush=True)
